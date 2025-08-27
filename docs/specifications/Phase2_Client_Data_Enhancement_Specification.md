# Phase 2: Client Data Enhancement Specification

**Version:** 1.0  
**Date:** 2025-08-26  
**Status:** Draft - For Visual Prototype Development

---

## Executive Summary

Phase 2 is a **supplementary enhancement** to Kingston's Portal that adds comprehensive client data management capabilities **alongside the existing managed product infrastructure**. This phase introduces flexible client information storage, unmanaged product tracking, and historical data snapshots for compliance and audit requirements.

### Core Business Driver
- **Problem:** Need historical snapshots of client data for compliance ("What did we know when we made this decision?")
- **Solution:** Dual-track system - managed products (existing) + unmanaged client data (new)
- **Benefit:** Complete client picture with point-in-time audit trails for KYC and networth statements

### System Enhancement Philosophy
- **Existing managed products:** Preserve all current IRR calculations, analytics, and performance tracking
- **NEW unmanaged products:** Simple valuation tracking for KYC/networth purposes only  
- **NEW client information:** JSON-based flexible data for comprehensive client profiles
- **Historical preservation:** Snapshot capability for compliance and decision audit trails

---

## 1. System Architecture Changes

### 1.1 Data Model Overhaul

#### Enhanced Client Groups
- **Mandatory Fields:** Name and type only
- **Optional Fields:** All other information can be added retrospectively
- **Retrospective Enhancement:** Easy data addition over time
- **Multi-product owner associations** with flexible ownership models

#### Product Owner Relationships
- **Mandatory Fields:** First name and surname only
- **Optional Fields:** DOB, Address, Marital Status, Vulnerability Status
- **Ordering:** By inception date (date/time product owner was created in system)
- **Ownership Model:** Product owners are associated with items, not direct owners
- **Field Constraints:** Text fields up to 200 characters, phone numbers as plain text
- **Data Sensitivity:** All information treated as sensitive personal/financial data

#### New Item-Based Architecture
```
Client Group → Items (JSON data) → Product Owner Associations (with ownership types)
```

### 1.2 New Database Entities

#### Client Information Items Table (Hybrid Approach)
```sql
client_information_items (
  id BIGINT PRIMARY KEY,
  client_group_id BIGINT FK,
  item_type ENUM('basic_detail', 'income_expenditure', 'assets_liabilities', 'protection', 'vulnerability_health'),
  item_category VARCHAR(100),    -- e.g., "Home Address", "Bank Account", "Property", "Insurance Policy"
  data_content JSONB,            -- Flexible JSON structure with embedded ownership for applicable items
  date_created TIMESTAMP,
  date_updated TIMESTAMP,
  last_edited_by BIGINT FK       -- References profiles table
)
```

#### JSON Structure Examples
```json
-- Home Address (Basic Detail - No ownership associations)
{
  "address_line_one": "1 New Street",
  "address_line_two": "Neverland", 
  "postcode": "N0TH 3R3"
}

-- Bank Account (Asset - With ownership associations)
{
  "bank": "Barclays",
  "latest_valuation": 2500,
  "associated_product_owners": {
    "association_type": "tenants_in_common",
    "123": 50,
    "456": 50
  }
}

-- Joint ISA (Asset - Joint ownership example)  
{
  "provider": "Vanguard",
  "account_type": "Stocks & Shares ISA",
  "latest_valuation": 15000,
  "associated_product_owners": {
    "association_type": "joint_ownership",
    "collective_percentage": 100,
    "joint_owners": [123, 456]
  }
}
```

#### Actions Table
```sql
client_actions (
  id BIGINT PRIMARY KEY,
  client_group_id BIGINT FK,
  name VARCHAR(255),
  description TEXT,
  owner ENUM('advisor', 'client'),
  status ENUM('outstanding', 'completed'),
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMP,
  completed_at TIMESTAMP
)
```

#### Objectives Table
```sql
client_objectives (
  id BIGINT PRIMARY KEY,
  client_group_id BIGINT FK,
  title VARCHAR(255),
  description TEXT,
  target_date DATE,
  status VARCHAR(50),
  created_at TIMESTAMP
)
```

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