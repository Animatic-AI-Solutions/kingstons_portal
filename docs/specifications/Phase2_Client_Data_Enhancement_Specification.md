# Phase 2: Client Data Enhancement Specification - Information-Dense Professional Interface

**Version:** 2.0 (Enhanced)  
**Date:** September 1, 2025  
**Status:** Implementation Ready - Client-Validated Requirements  
**Priority:** Information Density Over Aesthetics

---

## 1. Business Requirements - Information Density Priority

### 1.1 Core Business Driver - Professional Interface Focus
- **Problem:** Advisors need maximum information visibility with minimal navigation for efficient client management
- **Client-Validated Solution:** Information-dense professional interface that prioritizes data accessibility over visual appeal
- **Business Benefit:** 60% efficiency gains in client data processing through dense UI paradigm and streamlined workflows
- **Professional Standard:** Wealth management interface optimized for advisor productivity and comprehensive client understanding

### 1.2 Information Density Philosophy
- **Primary Goal:** Maximum information per screen with professional wealth management aesthetics
- **UI Paradigm Shift:** From card-based layouts to dense tables and 3-section product owner displays
- **Professional Interface:** Designed for experienced financial advisors who prioritize information access over visual simplicity
- **Client Validation:** Interface design validated against real advisor workflows and efficiency requirements

### 1.3 System Enhancement Strategy
- **Existing Infrastructure:** Preserve all managed product IRR calculations, analytics, and performance tracking (zero breaking changes)
- **Enhanced Data Model:** Professional-grade client information management with comprehensive product owner associations
- **Dense UI Components:** Information-rich interfaces optimized for advisor efficiency and rapid client comprehension
- **Historical Compliance:** Point-in-time snapshots for audit trails and regulatory compliance requirements

---

## 2. UI/UX Specifications - Dense Table Paradigm

### 2.1 Information-Dense Interface Standards

#### Professional Interface Components
- **3-Section Product Owner Cards:** Personal details (left) + Contact information (right) + Full-width bottom section
- **Dense Table Layout:** Maximum rows per screen (12+ rows) with comprehensive column information
- **Big 5 Category System:** 📋 Basic Detail, 💰 Income Expenditure, 🏦 Assets Liabilities, 🛡️ Protection, 🏥 Vulnerability Health
- **Multiple Phone Type Display:** Mobile, House Phone, Work, Other with clear professional labeling
- **Complex Ownership Visualization:** Individual percentages, tenants in common, joint ownership clearly displayed in compact format

#### Enhanced Product Owner Information Display
- **Contact Information Density:** Multiple phone types (mobile, house_phone, work, other) with international format support
- **Meeting Information:** Next meeting date, last meeting date (month/day only for screen efficiency)
- **Compliance Information:** T&C signing dates, fee agreement dates prominently displayed
- **Security Integration:** Security words and notes with expandable interface for space efficiency
- **Professional Layout:** Maximum information visibility with clear hierarchical organization

#### Dense Data Architecture
```
Client Group → Information-Dense Tables → 3-Section Product Owner Cards → Complex Ownership Display
            ↓
Maximum Information Per Screen → Professional Advisor Interface
```

### 2.2 Professional Interface Data Requirements

#### Enhanced Information Items (Dense Display Optimized)
```sql
client_information_items (
  id BIGINT PRIMARY KEY,
  client_group_id BIGINT FK,
  item_type ENUM('basic_detail', 'income_expenditure', 'assets_liabilities', 'protection', 'vulnerability_health'), -- Big 5 Categories
  item_category VARCHAR(100),    -- Specific item type for dense table display
  data_content JSONB,            -- Enhanced with ownership complexity for professional display
  priority VARCHAR(20) DEFAULT 'standard', -- For dense table sorting optimization
  status VARCHAR(50) DEFAULT 'current',    -- Professional status tracking
  quick_summary TEXT,            -- Brief summary for dense table efficiency
  date_created TIMESTAMP,
  date_updated TIMESTAMP,
  last_edited_by BIGINT FK
)
```

#### JSON Structure Examples
```json
// Home Address - Basic Detail (Dense Table Display)
{
  "address_line_one": "1 New Street",
  "address_line_two": "Neverland", 
  "postcode": "N0TH 3R3",
  "quick_summary": "1 New Street, N0TH 3R3"
}

// Bank Account - Assets (Professional Ownership Display)
{
  "bank": "Barclays",
  "account_type": "Current Account",
  "latest_valuation": 2500.00,
  "associated_product_owners": {
    "association_type": "tenants_in_common",
    "123": 60.00,
    "456": 40.00
  },
  "quick_summary": "Barclays Current - £2,500 (John 60%, Mary 40%)"
}

// Investment Account - Complex Ownership for Dense Display
{
  "provider": "Vanguard",
  "account_type": "Investment Account",
  "latest_valuation": 45000.00,
  "associated_product_owners": {
    "association_type": "tenants_in_common",
    "123": 70.00,
    "456": 25.00,
    "789": 5.00
  },
  "quick_summary": "Vanguard Investment - £45,000 (John 70%, Mary 25%, Other 5%)"
}
```

#### Enhanced Actions Table (Separated from Objectives)
```sql
client_actions (
  id BIGINT PRIMARY KEY,
  client_group_id BIGINT FK,
  -- NO objective_id - complete separation per client requirements
  title VARCHAR(255),
  description TEXT,
  target_date DATE,              -- Professional target date terminology
  drop_dead_date DATE,           -- Critical deadline for professional tracking
  assigned_to VARCHAR(255),
  assignment_type ENUM('advisor', 'client', 'other'),
  status ENUM('todo', 'in_progress', 'completed'),
  is_global BOOLEAN DEFAULT false, -- Global actions across client groups
  created_by VARCHAR(100) NOT NULL,
  updated_by VARCHAR(100),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
)
```

**Example Action Items:**
**To-Do Actions:**
1. **Review Pension Contributions** (*👨‍💼 Advisor*)
   - *Description*: "Analyze current pension contributions across all schemes including workplace pension and SIPP. Consider increasing contributions to maximize annual allowance and tax efficiency. Review provider performance and fees."
   - *Due Date*: 2024-09-15, *Assigned To*: John Advisor, *Status*: To-Do

2. **Provide Salary Documentation** (*👤 Client*)
   - *Description*: "Gather and provide recent P60s, last 3 months payslips, and employment contract. Client to collect these documents from HR department and scan for secure upload."
   - *Due Date*: 2024-09-20, *Assigned To*: John Smith (Client), *Status*: To-Do

3. **Complete Risk Questionnaire** (*👤 Client*)  
   - *Description*: "Fill out comprehensive attitude to risk questionnaire online. Client to complete all sections including capacity for loss assessment and investment experience details."
   - *Due Date*: 2024-09-25, *Assigned To*: Mary Smith (Client), *Status*: To-Do

**Completed Actions:**
4. **Initial Portfolio Review** (*👨‍💼 Advisor*)
   - *Description*: "Comprehensive review of existing investment portfolio including performance analysis, risk assessment, and alignment with client objectives. Identified opportunities for optimization."
   - *Completed Date*: 2024-08-20, *Assigned To*: John Advisor, *Status*: Completed

5. **Gather Bank Statements** (*👤 Client*)
   - *Description*: "Collect and provide last 6 months bank statements for all current accounts, savings accounts, and credit cards. Required for mortgage application and financial planning review."
   - *Completed Date*: 2024-08-25, *Assigned To*: John Smith (Client), *Status*: Completed

#### Enhanced Objectives Table (Independent Management)
```sql
client_objectives (
  id BIGINT PRIMARY KEY,
  client_group_id BIGINT FK,
  title VARCHAR(255),
  description TEXT,              -- Expandable descriptions for dense UI efficiency
  priority ENUM('high', 'medium', 'low'),
  start_date DATE,               -- Professional tracking of objective commencement
  last_discussed_date DATE,      -- Advisory meeting tracking
  target_date DATE,
  status ENUM('new', 'planning', 'active', 'completed', 'cancelled'),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
)
```

### 2.3 Enhanced Phone Management System
```sql
-- Professional phone number management for dense contact display
product_owner_phones (
    id SERIAL PRIMARY KEY,
    product_owner_id BIGINT NOT NULL REFERENCES product_owners(id) ON DELETE CASCADE,
    phone_type VARCHAR(20) NOT NULL, -- 'mobile', 'house_phone', 'work', 'other'
    phone_number VARCHAR(25) NOT NULL, -- International format support
    label VARCHAR(50),               -- Custom label for 'other' type
    is_primary BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

---

## 3. Data Model - Enhanced Product Owner Architecture

### 3.1 Product Owner Enhancements for Professional Interface
```sql
-- Enhanced product_owners table for 3-section card display
ALTER TABLE product_owners ADD COLUMN security_words TEXT;           -- Encrypted storage
ALTER TABLE product_owners ADD COLUMN notes TEXT;                    -- Encrypted storage  
ALTER TABLE product_owners ADD COLUMN next_meeting_date DATE;        -- Professional meeting tracking
ALTER TABLE product_owners ADD COLUMN last_meeting_date DATE;        -- Meeting history
ALTER TABLE product_owners ADD COLUMN date_signed_tc DATE;           -- Compliance tracking
ALTER TABLE product_owners ADD COLUMN last_fee_agreement_date DATE;  -- Fee agreement tracking
ALTER TABLE product_owners ADD COLUMN updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
ALTER TABLE product_owners ADD COLUMN updated_by VARCHAR(100);
```

### 3.2 Asset Liquidity Management (Professional Feature)
```sql
-- User-customizable asset liquidity rankings for professional networth display
CREATE TABLE asset_liquidity_rankings (
    id SERIAL PRIMARY KEY,
    asset_type VARCHAR(100) UNIQUE,
    liquidity_rank INTEGER,
    description TEXT,
    is_default BOOLEAN DEFAULT true,
    created_by VARCHAR(100) DEFAULT 'system'
);

-- User-specific liquidity preferences for personalized professional display
CREATE TABLE user_liquidity_preferences (
    id SERIAL PRIMARY KEY,
    user_id VARCHAR(100) NOT NULL,
    asset_type VARCHAR(100) NOT NULL,
    custom_rank INTEGER NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, asset_type)
);
```

### 3.3 Global Actions Architecture
```sql
-- Junction table for global actions across multiple client groups
CREATE TABLE client_action_groups (
    id SERIAL PRIMARY KEY,
    action_id BIGINT NOT NULL REFERENCES client_actions(id) ON DELETE CASCADE,
    client_group_id BIGINT NOT NULL REFERENCES client_groups(id) ON DELETE CASCADE,
    assigned_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    assigned_by VARCHAR(100) NOT NULL,
    UNIQUE(action_id, client_group_id)
);

-- Professional view for global actions management
CREATE VIEW global_actions_with_clients AS
SELECT 
    ca.id as action_id,
    ca.title,
    ca.description,
    ca.status,
    ca.target_date,
    ca.drop_dead_date,
    STRING_AGG(cg.name, ', ' ORDER BY cg.name) as assigned_client_groups,
    COUNT(cag.client_group_id) as client_group_count
FROM client_actions ca
LEFT JOIN client_action_groups cag ON ca.id = cag.action_id
LEFT JOIN client_groups cg ON cag.client_group_id = cg.id
WHERE ca.is_global = true
GROUP BY ca.id, ca.title, ca.description, ca.status, ca.target_date, ca.drop_dead_date;
```

---

## 4. API Specifications - Professional Interface Endpoints

### 4.1 Enhanced Client Information API
```typescript
// Dense table data retrieval for professional interface
interface InformationItemListResponse {
  items: {
    id: number;
    item_type: 'basic_detail' | 'income_expenditure' | 'assets_liabilities' | 'protection' | 'vulnerability_health';
    item_category: string;
    quick_summary: string;           // For dense table display
    ownership_display: string;       // Pre-formatted ownership for UI efficiency
    last_edited: string;
    priority: 'high' | 'standard' | 'low';
    status: string;
  }[];
  pagination: {
    total: number;
    page: number;
    limit: number;  // Support for 12+ rows per page
  };
}

// Enhanced phone management for 3-section cards
interface PhoneListResponse {
  phones: {
    id: number;
    phone_type: 'mobile' | 'house_phone' | 'work' | 'other';
    phone_number: string;
    label?: string;                  // For 'other' type
    is_primary: boolean;
    updated_at: string;
  }[];
}
```

### 4.2 Global Actions API (Professional Workflow Management)
```typescript
interface GlobalActionsResponse {
  actions: {
    id: number;
    title: string;
    description: string;
    target_date: string;
    drop_dead_date?: string;
    status: 'todo' | 'in_progress' | 'completed';
    assigned_client_groups: string[];
    urgency_level: 'overdue' | 'due_today' | 'due_soon' | 'normal';
    days_until_due: number;
  }[];
  summary: {
    overdue_count: number;
    due_today_count: number;
    total_active: number;
  };
}
```

### 4.3 Liquidity-Ordered Networth API
```typescript
interface LiquidityOrderedNetworthResponse {
  networth_data: {
    asset_categories: {
      category: string;
      liquidity_rank: number;        // User-customizable ranking
      items: {
        name: string;
        valuation: number;
        ownership_breakdown: {
          [owner_name: string]: number;
        };
        liquidity_notes?: string;
      }[];
      category_total: number;
    }[];
    grand_total: number;
    user_liquidity_preferences?: {
      [asset_type: string]: number;  // Custom rankings
    };
  };
}
```

---

## 5. Security Requirements - Enhanced Security Model

### 5.1 Field-Level Encryption Implementation
- **Security Words**: AES-256 encryption at rest with key rotation
- **Notes Fields**: Full encryption for sensitive advisor notes
- **Phone Numbers**: Standard storage with access logging
- **Audit Logging**: Comprehensive tracking of all sensitive field access

### 5.2 Enhanced RBAC (Role-Based Access Control)
```typescript
// Professional interface permissions
interface SecurityPermissions {
  can_view_security_words: boolean;
  can_edit_security_words: boolean;
  can_view_sensitive_notes: boolean;
  can_export_client_data: boolean;
  can_manage_global_actions: boolean;
  can_customize_liquidity_rankings: boolean;
}
```

### 5.3 Audit Trail Architecture
```sql
-- Enhanced audit logging for professional compliance
CREATE TABLE enhanced_audit_log (
    id SERIAL PRIMARY KEY,
    entity_type VARCHAR(50) NOT NULL,     -- 'product_owner', 'information_item', etc.
    entity_id BIGINT NOT NULL,
    action_type VARCHAR(50) NOT NULL,     -- 'view', 'edit', 'create', 'delete'
    field_changed VARCHAR(50),            -- Specific field for granular tracking
    old_value_hash TEXT,                  -- Hashed sensitive data
    new_value_hash TEXT,
    user_id VARCHAR(100) NOT NULL,
    ip_address INET,
    user_agent TEXT,
    session_id VARCHAR(100),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

---

## 6. Performance Requirements - Dense Data Display

### 6.1 Professional Interface Performance Targets
- **Dense Table Rendering**: <500ms for 12+ rows with complex ownership display
- **3-Section Card Loading**: <200ms for complete product owner information
- **Global Actions Page**: <1s for cross-client action aggregation
- **Liquidity-Ordered Display**: <2s for networth calculation with custom rankings
- **Search Performance**: <300ms for full-text search across all information items

### 6.2 Virtual Scrolling Implementation
```typescript
// Professional dense table optimization
interface VirtualScrollConfig {
  rowHeight: 48;                    // Dense row height for maximum information
  overscan: 5;                      // Buffer rows for smooth scrolling
  maxVisibleRows: 15;               // Professional interface row limit
  enableHorizontalVirtualization: true; // For wide ownership columns
}
```

### 6.3 Memory Management for Dense Data
- **Client-Side Caching**: 50MB limit for information items
- **Pagination Strategy**: 50-200 items per page (user configurable)
- **Image Optimization**: WebP format with lazy loading
- **API Response Compression**: Gzip compression for JSON responses

---

## 7. User Experience - Professional Interface Workflows

### 7.1 Information Density User Experience Goals
- **Advisor Efficiency**: 60% reduction in screen navigation for client reviews
- **Information Accessibility**: Maximum data visibility per screen interaction
- **Professional Aesthetics**: Clean, business-focused interface design
- **Workflow Optimization**: Streamlined paths for common advisor tasks

### 7.2 Dense UI Component Specifications
```typescript
// Professional 3-section product owner card
interface ProductOwnerCardProps {
  productOwner: {
    personal_details: {
      known_as: string;
      title: string;
      date_of_birth: string;
      ni_number: string;
    };
    contact_information: {
      phones: PhoneInfo[];
      email: string;
    };
    meeting_compliance: {
      next_meeting: string;
      last_meeting: string;
      date_signed_tc: string;
      fee_agreement: string;
      security_words: string;
      notes: string;
    };
  };
  displayMode: 'dense' | 'expanded';
  onEdit: () => void;
}

// Dense table for maximum information display
interface DenseTableProps {
  data: InformationItem[];
  columns: {
    key: string;
    label: string;
    width: string;
    sortable: boolean;
  }[];
  rowsPerPage: number;              // 12-15 for professional density
  virtualScrolling: boolean;
  ownershipColumnWidth: '25%';      // Optimized for complex ownership display
}
```

### 7.3 Global Actions Workflow
```typescript
// Professional cross-client action management
interface GlobalActionsWorkflow {
  actionStates: {
    'todo': { color: 'blue', priority: 3 };
    'in_progress': { color: 'yellow', priority: 2 };
    'completed': { color: 'green', priority: 1 };
  };
  urgencyLevels: {
    'overdue': { color: 'red', days: -1 };
    'due_today': { color: 'orange', days: 0 };
    'due_soon': { color: 'yellow', days: 1-3 };
    'normal': { color: 'gray', days: 4+ };
  };
  bulkOperations: {
    'mark_completed': boolean;
    'extend_deadline': boolean;
    'reassign_clients': boolean;
    'export_pdf': boolean;
  };
}
```

---

## 8. Implementation Strategy - Professional Interface Migration

### 8.1 UI Paradigm Migration Approach
1. **Phase 1**: Implement dense table components with virtual scrolling
2. **Phase 2**: Deploy 3-section product owner cards with enhanced contact management
3. **Phase 3**: Roll out global actions workflow with cross-client capabilities
4. **Phase 4**: Launch liquidity-ordered networth with user customization
5. **Phase 5**: Complete professional interface optimization

### 8.2 Database Migration Complexity
- **Schema Changes**: Enhanced product_owners, separated actions/objectives
- **Data Migration**: Convert existing data to enhanced ownership model
- **Index Optimization**: GIN indexes for JSON querying performance
- **Audit System**: Comprehensive logging for professional compliance

### 8.3 Change Management for Professional Interface
- **Advisor Training**: 2-hour training sessions focused on efficiency gains
- **Interface Customization**: User preference settings for information density
- **Feedback Integration**: Regular advisor input for professional interface refinement
- **Performance Monitoring**: Real-time metrics for interface efficiency measurement

---

## 9. Success Criteria - Professional Interface Excellence

### 9.1 Client-Validated Success Metrics
- **Information Access Efficiency**: >85% improvement in data visibility
- **Advisor Productivity**: 60% reduction in client review time
- **Interface Satisfaction**: >4.5/5 rating from professional advisors
- **Workflow Optimization**: <3 clicks for common advisor tasks
- **Performance Standards**: All dense UI components meet response time targets

### 9.2 Professional Interface ROI
- **Efficiency Gains**: 12-15 month payback through reduced advisory time
- **Client Satisfaction**: Improved advisor responsiveness and information accuracy
- **Compliance Enhancement**: 100% audit trail coverage with <5 min report generation
- **System Performance**: Maintained within 25% of baseline with enhanced functionality

---

**This specification represents a complete professional interface transformation for Kingston's Portal Phase 2, prioritizing information density, advisor efficiency, and client-validated requirements over aesthetic considerations. The implementation delivers maximum information visibility through dense tables, 3-section product owner cards, and streamlined workflows optimized for experienced financial advisors.**
```

**Example Client Objectives:**
1. **Retirement Planning** (*Priority: High*)
   - *Description*: "Build a comprehensive retirement portfolio targeting £750,000 by age 65. Focus on maximizing pension contributions and ISA allowances while maintaining appropriate risk levels for long-term growth."
   - *Target Date*: 2030-12-31, *Status*: In Progress

2. **House Purchase** (*Priority: Medium*)
   - *Description*: "Save for deposit on family home in Surrey area. Target property value £450,000 requiring £90,000 deposit plus stamp duty and legal costs. Maintain funds in accessible investments."
   - *Target Date*: 2026-06-30, *Status*: Planning

3. **Children's Education Fund** (*Priority: Medium*)  
   - *Description*: "Establish education savings for two children currently aged 8 and 10. Target £40,000 per child for university costs including accommodation. Utilize Junior ISAs and education-specific savings products."
   - *Target Date*: 2032-09-01, *Status*: Planning

#### Networth Statement Snapshots
```sql
networth_statements (
  id BIGINT PRIMARY KEY,
  client_group_id BIGINT FK,
  created_by BIGINT FK,
  created_at TIMESTAMP,
  snapshot_data JSONB -- Complete snapshot of all items and values at creation time
)
```

### Networth Statement Table Structure and Styling

#### Table Organization
The networth statement table follows a hierarchical structure organized by item types with individual items and subtotals:

**Hierarchical Layout:**
```
ITEM TYPE HEADER (e.g., "GIAS")
  Individual Item 1        £amount  £amount  £amount  £total
  Individual Item 2        £amount  £amount  £amount  £total
Item Type Total           £subtotal £subtotal £subtotal £subtotal

ITEM TYPE HEADER (e.g., "BANK ACCOUNTS")  
  Individual Item 1        £amount  £amount  £amount  £total
  Individual Item 2        £amount  £amount  £amount  £total
Item Type Total           £subtotal £subtotal £subtotal £subtotal

TOTAL ASSETS              £grand   £grand   £grand   £grand
```

#### Data Structure Requirements
```json
{
  "item_types": [
    {
      "type": "GIAs",
      "is_managed": true,
      "items": [
        {
          "name": "Zurich Vista GIA",
          "john": 125000,
          "mary": 95000, 
          "joint": 0,
          "total": 220000
        }
      ]
    },
    {
      "type": "Bank Accounts",
      "is_managed": false,
      "items": [
        {
          "name": "Halifax Current Account",
          "john": 2250,
          "mary": 1750,
          "joint": 0,
          "total": 4000
        }
      ]
    }
  ]
}
```

#### Professional Styling Specifications

**Section Headers:**
- Dark gray top borders (`border-t-2 border-gray-400`)
- Bold uppercase text with letter tracking
- No background color - clean monochromatic appearance
- Full-width spanning across all columns

**Individual Items:**
- Clean indentation (left padding of 2rem)
- Light gray text (`text-gray-700`) for readability
- Subtle hover effects (`hover:bg-gray-50`)
- Light borders between rows (`border-b border-gray-200`)
- Em dashes (—) for zero values instead of £0

**Section Subtotals:**
- Light gray background (`bg-gray-100`)
- Semibold font weight with italic styling for "Total" labels
- Thicker bottom borders (`border-b-2 border-gray-300`)
- Clear visual separation from individual items

**Grand Total Row:**
- Prominent top border (`border-t-4 border-gray-600`)
- Light gray background (`bg-gray-50`)
- Bold uppercase text with increased padding
- Larger text size for visual hierarchy
- Professional financial document appearance

**Typography Standards:**
- Regular weight for data values
- Semibold for section totals
- Bold for grand totals
- Right-aligned monetary values
- Consistent spacing and padding
- Monochromatic gray color scheme throughout

#### Unmanaged Products Table (NEW)
```sql
-- New table for unmanaged products (KYC/networth only)
client_unmanaged_products (
  id BIGINT PRIMARY KEY,
  client_group_id BIGINT FK,
  product_name VARCHAR(255),
  product_type ENUM('GIAs', 'Stocks_and_Shares_ISAs', 'Cash_ISAs', 'Bank_Accounts', 'Pensions', 'Offshore_Bonds', 'Onshore_Bonds', 'Individual_Shares', 'Property', 'Others'),
  provider_id BIGINT FK,            -- FK to existing available_providers table
  latest_valuation NUMERIC(15,2),
  valuation_date DATE,
  ownership_details JSONB,          -- Embedded ownership like other items
  status VARCHAR(50) DEFAULT 'active', -- Can be 'active', 'sold', etc.
  created_at TIMESTAMP,
  updated_at TIMESTAMP,
  last_edited_by BIGINT FK
)
```

#### Existing System Preservation
```sql
-- EXISTING TABLES REMAIN UNCHANGED:
-- ✅ client_products (managed products with full IRR infrastructure)
-- ✅ product_owner_products (existing ownership model)
-- ✅ portfolios, portfolio_funds, portfolio_fund_valuations
-- ✅ portfolio_irr_values, portfolio_fund_irr_values
-- ✅ All existing analytics views and performance infrastructure
```

#### Product Owner Enhancements
```sql
-- Add inception_date to existing product_owners table
ALTER TABLE product_owners ADD COLUMN inception_date TIMESTAMP DEFAULT NOW();
-- Update mandatory fields constraint
ALTER TABLE product_owners ALTER COLUMN firstname SET NOT NULL;
ALTER TABLE product_owners ALTER COLUMN surname SET NOT NULL;
```

#### Optional Performance Optimization Views
```sql
-- Materialized view for common basic details queries
CREATE MATERIALIZED VIEW client_basic_details_view AS
SELECT 
  id,
  client_group_id,
  data_content->>'name' as name,
  (data_content->>'date_of_birth')::date as date_of_birth,
  data_content->>'address_line_one' as address_line_one,
  data_content->>'postcode' as postcode,
  date_updated
FROM client_information_items 
WHERE item_type = 'basic_detail';

-- Materialized view for networth statement data
CREATE MATERIALIZED VIEW client_assets_liabilities_view AS
SELECT 
  id,
  client_group_id,
  item_category,
  (data_content->>'latest_valuation')::numeric as latest_valuation,
  data_content->'associated_product_owners' as ownership_info,
  date_updated
FROM client_information_items 
WHERE item_type IN ('assets_liabilities', 'protection')
AND data_content ? 'latest_valuation';
```

---

## 2. User Interface Specifications

### 2.1 Enhanced Client Details Page

#### 2.1.1 Product Owner Cards Layout
- **Display:** Card-based layout showing all product owners
- **Ordering:** By inception date (earliest first)
- **Card Contents:**
  - Name (required, prominent display)
  - DOB (if available, formatted dd/mm/yyyy)
  - Address (if available, summary format)
  - Marital Status (if available, icon + text)
  - Vulnerability Status (if true, warning indicator)

#### 2.1.2 Tab Navigation System
```
┌─────────────────────────────────────────────────┐
│ [Client Overview] [Main List] [Aims, Objectives, Actions] │
│ [Networth Statement] [Know Your Customer]       │
└─────────────────────────────────────────────────┘
```

### 2.2 Tab Specifications

#### Tab 1: Client Overview
- **Purpose:** Snapshot summary of all product owners
- **Content:**
  - Product owner cards (as specified above)
  - Key metrics summary
  - Recent activity overview

#### Tab 2: Main List
- **Purpose:** Comprehensive item management interface
- **Features:**
  - **Create Item Button:** Prominent button at top to create new items with type navigation
  - **Search Function:** Search bar at top to query items based on content
  - **Filter System:**
    - Item type multi-select (all selected by default)
    - Types: Basic Detail, Income & Expenditure, Assets & Liabilities, Protection, Vulnerability & Health
  - **Column Filters:**
    - Item category (searchable)
    - Product owner (dropdown)
    - Date updated (date range)
  - **Item Actions:**
    - Edit item (opens modal using existing styling patterns)
    - Delete item (with confirmation)
    - Associate/disassociate product owners (triggers ownership reconfiguration)
  - **Concurrent Editing:** Prevent multiple advisors editing same item simultaneously

#### Tab 3: Aims, Objectives, and Actions
- **Purpose:** Task and objective management
- **Sections:**
  1. **Outstanding Actions**
     - Name (text)
     - Owner (Advisor/Client dropdown)
     - Description (expandable text area)
     - Active flag (toggle)
  2. **Completed Actions**
     - Historical view with completion dates
     - Archive/restore functionality
  3. **Objectives**
     - Goal setting and tracking
     - Target dates and progress indicators

#### Tab 4: Networth Statement
- **Purpose:** Complete financial position combining managed + unmanaged assets
- **Data Sources & Auto-Population:**
  - **Managed Products:** Auto-populated from existing `client_products` grouped by `product_type` (e.g., GIA managed products appear under "GIAs" section)
  - **Unmanaged Products:** From `client_unmanaged_products` table, grouped by `product_type`
  - **Other Assets/Liabilities:** From `client_information_items` where `item_type = 'assets_liabilities'`
- **Layout:** Table format organized by product/item types:
  - **Sections:** GIAs, Stocks & Shares ISAs, Cash ISAs, Bank Accounts, Pensions, Offshore Bonds, Onshore Bonds, Individual Shares, Property, Others
  - **Auto-Categorization:** Both managed and unmanaged products automatically appear in their respective sections
  - **Rows:** Individual products/items within each section
  - **Columns:** Each product owner + "Joint" column + "Total" column
  - **Sub-totals:** Each section has a subtotal row showing column sums for that section
  - **Currency:** GBP only, values to 2 decimal places
- **Calculation Logic:**
  - **Individual Ownership:** Full value in owner's column, zero in others
  - **Tenants in Common:** Percentage split across individual owner columns  
  - **Joint Ownership:** Full percentage in "Joint" column, zero in individual columns
  - **Total Column:** Sum of all columns for each row
- **Snapshot Creation Process:**
  - **User Action:** Advisor clicks "Create Networth Statement" button
  - **Data Capture:** System captures all current values of managed products, unmanaged products, and relevant information items
  - **Storage:** Complete snapshot saved to `networth_statements` table with timestamp
  - **Audit Trail:** Historical versions show exactly "what the client had and their values at time of creation"
- **Inline Editing:** Advisors can edit values directly, updates source data appropriately

#### Tab 5: Know Your Customer
- **Purpose:** KYC report generation and management based on existing company template
- **Template Structure:** Emulates current KYC document with these main sections:
  1. **Personal Details:** Name, DOB, address, employment, health, domicile status
  2. **Family & Dependents:** Dependent information and family circumstances
  3. **Income Details:** Employment income, self-employment, other income, pensions
  4. **Expenditure:** Living costs, mortgage payments, insurance premiums, loans
  5. **Assets:** Property values, cash savings, ISAs, investments (excluding managed products)
  6. **Liabilities:** Mortgages, personal loans, car loans, credit commitments
  7. **Personal Objectives:** Investment goals, retirement planning, priorities
  8. **Risk Assessment:** Attitude to risk, capacity for loss, investment experience

- **Data Population Logic:**
  - **Automatic Fields:** Populated from client information items (names, addresses, income, assets)
  - **Manual Fields:** Advisor-editable text areas (objectives in client's own words, notes)
  - **Managed Products:** Auto-populated from `client_managed_products` table
  - **Product Owner Columns:** "Client One" and "Client Two" represent the product owners
  
- **Features:**
  - **Live Preview:** Editable preview of complete report before PDF generation
  - **Section Management:** Include/exclude entire sections or individual items
  - **PDF Generation:** Download-only PDF creation (no database storage)
  - **Universal Access:** All advisors can generate KYC reports
  - **Template Fidelity:** Maintains exact structure and formatting of current template

---

## 3. Technical Implementation Requirements

### 3.1 Backend API Enhancements

#### New Endpoints
```
# Client Information Items Management
GET    /api/client_groups/{id}/items                    # All items for main list
GET    /api/client_groups/{id}/items?type=basic_detail  # Filtered by type
POST   /api/client_groups/{id}/items                    # Create new item
PUT    /api/items/{id}                                  # Update item (including JSON content)
DELETE /api/items/{id}                                  # Delete item

# Unmanaged Products Management
GET    /api/client_groups/{id}/unmanaged_products       # All unmanaged products for client
POST   /api/client_groups/{id}/unmanaged_products       # Create new unmanaged product
PUT    /api/unmanaged_products/{id}                     # Update unmanaged product
DELETE /api/unmanaged_products/{id}                     # Delete unmanaged product
PUT    /api/unmanaged_products/{id}/status              # Change status (active/sold)

# Actions and Objectives
GET    /api/client_groups/{id}/actions
POST   /api/client_groups/{id}/actions
PUT    /api/actions/{id}
GET    /api/client_groups/{id}/objectives
POST   /api/client_groups/{id}/objectives  
PUT    /api/objectives/{id}

# Networth Management
GET    /api/client_groups/{id}/networth/current         # Real-time networth data
POST   /api/client_groups/{id}/networth/snapshot        # Create audit snapshot  
PUT    /api/items/{id}/valuation                        # Inline editing of latest_valuation
GET    /api/client_groups/{id}/networth/history         # Historical snapshots

# KYC Report Generation
GET    /api/client_groups/{id}/kyc-data                 # All client data for KYC
POST   /api/client_groups/{id}/kyc-preview              # Generate editable preview
POST   /api/client_groups/{id}/kyc-report/generate      # Create final PDF

# Product Owner Association Validation
POST   /api/items/{id}/validate-ownership               # Validate percentage splits
```

### 3.2 Frontend Component Requirements

#### New Components Needed
- `ProductOwnerCard` - Individual product owner display (reuse existing card patterns)
- `ClientItemEditor` - Create/edit client information items modal (styled like existing create modals)
- `UnmanagedProductEditor` - Create/edit unmanaged products modal (styled like existing create modals)
- `NetworthStatementTable` - Financial position table with sections and ownership columns
- `KYCReportBuilder` - Report generation interface with preview

#### Component Reuse Strategy
- **Main List Tab:** Use existing `DataTable` with `TableFilter` and `TableSort` components
- **Item Type Filtering:** Use existing `MultiSelectDropdown` for item type selection
- **Actions:** Leverage existing `ActionButton`, `AddButton`, `EditButton`, `DeleteButton` family
- **Forms:** Use existing input components (`BaseInput`, `NumberInput`, `BaseDropdown`)
- **Product Creation:** Extend existing "Create Products" page with new "Unmanaged Product" option
- **Modal Styling:** Follow existing modal patterns and styling for consistency

### 3.3 Implementation Strategy (ADD-ON Approach)

#### Phase 1: New Infrastructure Addition
- Add new `client_information_items` table alongside existing tables
- Add new `client_unmanaged_products` table for non-IRR products
- Add `inception_date` to existing `product_owners` table
- **ZERO CHANGES** to existing managed product infrastructure

#### Phase 2: Supplementary API Development
- **NEW endpoints only:** `/api/client_groups/{id}/items`, `/api/client_groups/{id}/unmanaged_products`
- **Existing endpoints unchanged:** All current managed product APIs remain identical
- **Enhanced client details:** New tabs added to existing client details page
- **Preserved functionality:** All current features continue working exactly as before

#### Phase 3: Feature Rollout
- Enable new client information management system
- Deploy enhanced client details interface with new tabs
- User training on additional capabilities (existing workflows unchanged)
- Monitor performance of new features without affecting existing operations

---

## 4. User Experience Design Principles

### 4.1 Minimal Setup Philosophy
- **Client Groups:** Name and type only initially required
- **Product Owners:** Name only initially required
- **Progressive Enhancement:** Easy data addition over time

### 4.2 Ownership Model
- **Tenants in Common:** Separate percentage ownership per product owner (individual % for each)
- **Joint Ownership:** Collective ownership percentage for all associated product owners (single % for group)
- **Scope:** Only applies to products, assets & liabilities, and protection items
- **Third Party Ownership:** No validation that percentages sum to 100% (allows for external ownership)
- **Flexible Associations:** Items can exist without any product owner associations

### 4.3 Data Management Philosophy
- **Dual-Track System:** Managed products (full IRR infrastructure) + unmanaged products (simple valuations)
- **Provider Integration:** Unmanaged products use existing `available_providers` table for consistency
- **Product Lifecycle:** Unmanaged products can transition to managed products over time
- **Embedded Ownership:** Product owner associations stored within JSON for assets/liabilities/protection
- **Flexible Schema:** JSON structure adapts to any data type without schema changes
- **Historical Preservation:** Networth statements create audit snapshots with complete data at creation time
- **Universal Access:** All advisors can view and edit all clients and items
- **Concurrent Editing Control:** Prevent multiple advisors editing same item simultaneously
- **Data Retention:** All data retained indefinitely unless explicitly deleted
- **No Change Logging:** No audit trail required for item modifications

### 4.4 Unmanaged to Managed Product Transition
- **Business Workflow:** Unmanaged products may be sold/transferred into new managed products
- **Status Tracking:** Unmanaged products can be marked as 'sold' when transferred
- **Value Transfer:** Money from unmanaged product becomes initial investment in new managed product
- **Historical Continuity:** Both original unmanaged and new managed product retained for audit purposes
- **Advisory Process:** Advisors can create managed product and reference the unmanaged product it replaces

### 4.4 Information Architecture
- **Client-Centric:** All information belongs to client group first
- **Association-Based:** Flexible product owner relationships with ownership types
- **Category-Driven:** Clear item type organization (Basic Detail, Income/Expenditure, etc.)

---

## 5. Success Criteria

### 5.1 Functional Requirements
- [ ] Enhanced client details page with product owner cards
- [ ] Five-tab navigation system implemented
- [ ] Item-based information management system
- [ ] Multi-product owner associations with percentage splits
- [ ] Networth statement generation
- [ ] Basic KYC report generation

### 5.2 Performance Requirements
- Page load times under 2 seconds for ~130 clients with ~30 items each (~3,900 total items)
- Real-time item filtering and searching across all client items
- Desktop/monitor-only design (no mobile/tablet requirements)
- Intranet hosting (no offline access required)

### 5.3 User Experience Requirements
- Intuitive item creation and editing
- Clear visual hierarchy in product owner cards
- Efficient navigation between client management functions

---

## 6. Development Phases

### Phase 2.1: Foundation (Weeks 1-2)
- Database schema implementation
- Basic API endpoint development
- Core component creation

### Phase 2.2: Core Features (Weeks 3-4)
- Client Overview tab with product owner cards
- Main List tab with item management
- Basic filtering and search functionality

### Phase 2.3: Advanced Features (Weeks 5-6)
- Actions and objectives management
- Networth statement basic version
- KYC report foundation

### Phase 2.4: Polish and Integration (Weeks 7-8)
- UI/UX refinements
- Performance optimization
- Comprehensive testing

---

## 7. Risk Assessment

### High Risk
- **Data Migration Complexity:** Existing client data structure changes
- **User Adoption:** Significant workflow changes for advisors

### Medium Risk
- **Performance:** Large item lists may impact loading times
- **Data Integrity:** Multi-owner percentage splits validation

### Low Risk
- **Component Integration:** Leveraging existing UI library
- **Backend Scalability:** FastAPI can handle additional endpoints

---

## 8. Next Steps

### Immediate Actions (This Week)
1. **Stakeholder Review:** Gather feedback on this specification
2. **Visual Prototyping:** Create mockups for user validation
3. **Technical Architecture Review:** Validate database schema changes

### Short-term Actions (Next 2 Weeks)
1. **Detailed UI/UX Design:** Complete visual design system
2. **Database Schema Finalization:** Implement and test new tables
3. **API Contract Definition:** Finalize endpoint specifications

---

## Appendix

### A. Current vs. Future State Comparison

| Aspect | Current State | Future State |
|--------|---------------|---------------|
| Data Ownership | Product owners own data directly | Client groups own data, associated with product owners |
| Client View | Product-focused listing | Comprehensive product owner cards |
| Information Management | Scattered across multiple areas | Centralized item-based system |
| Reporting | Basic financial reports | KYC and networth statements |
| Setup Complexity | Full data entry required | Minimal setup, retrospective enhancement |

### B. Item Types Detail

| Item Type | Description | Example Fields | KYC Section Mapping |
|-----------|-------------|----------------|-------------------|
| Basic Detail | Personal information | Name, DOB, Address, Marital Status, Employment, Health | Personal Details, Family & Dependents |
| Income & Expenditure | Financial flows | Employment Income, Self-Employment, Pensions, Living Costs, Insurance Premiums | Income Details, Expenditure |
| Assets & Liabilities | Financial position | Property Values, Bank Accounts, ISAs, Mortgages, Loans | Assets, Liabilities |
| Protection | Insurance and protection | Life Assurance, Income Protection, General Insurance | Expenditure (premiums), Risk Assessment |
| Vulnerability & Health | Special considerations | Health Issues, Vulnerable Client Status, Smoker Status | Personal Details, Risk Capacity |

### C. KYC Template Data Point Mapping

**Automatic Population from Items:**
- Personal Details: Title, Names, DOB, Address, Employment, Health, Marital Status
- Income: Employment income, self-employment, pensions, investment income, rental income  
- Expenditure: Mortgage payments, loan payments, insurance premiums, living costs
- Assets: Property values, bank accounts, ISAs, cash savings, other investments
- Liabilities: Mortgage details, personal loans, car loans, credit commitments

**Manual Advisor Input Required:**
- Personal Objectives (in client's own words)
- Goals and needs descriptions  
- Risk attitude assessment notes
- Retirement planning commentary
- Any specific client circumstances or health considerations
- Priority rankings for financial objectives

**Auto-Generated from System:**
- Current managed products and valuations
- Portfolio performance data
- Investment history and experience level

---

*This specification serves as the foundation for visual prototype development and stakeholder feedback gathering. Details will be refined based on user testing and business requirements validation.*