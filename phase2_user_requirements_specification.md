# Phase 2 User Requirements Specification
**Based on User Feedback from Sean**  
**Date:** September 5, 2025  
**Status:** Requirements Definition - Pre-Implementation  
**Priority:** Critical User Experience Requirements

---

## Executive Summary

Based on extensive user feedback from Sean (Prestwood user), this document outlines critical requirements for Phase 2 implementation that prioritize user experience improvements over the existing system while maintaining information density and functionality.

**Key Changes from Original Design:**
- **5 Separate Category Tables** instead of one massive list
- **Modern + Compact UI Hybrid** approach 
- **Inline Editing** for unmanaged products
- **Expandable Rows** for detailed information
- **Integration with Existing Managed Products** system

---

## 1. Core Architecture Requirements

### 1.1 Big 5 Category Separation
**Requirement:** Replace single master table with 5 separate category tables

**Business Justification:** "Different categories have such wildly different data structures and the user needs to see different columns for each category"

**Implementation:**
- Each Big 5 category gets its own dedicated table/page
- Category-specific column structures optimized for that data type
- Navigation between categories via tabs or section headers

### 1.2 Modern Compact Table Design
**Requirement:** "Mix of modern UI design and super compact tables"

**User Need:** Page looks modern but still satisfies seeing as many items on screen at once

**Design Principles:**
- Modern visual design elements (typography, spacing, colors)
- Maximum information density (12+ rows visible)
- Clean, uncluttered interface
- Professional wealth management aesthetics

---

## 2. Table Structure Requirements by Category

### 2.1 Assets & Liabilities Table
**Page Integration:** Merges with existing managed products page

**Columns Required:**
1. **Type** - Item type (Cash Accounts, ISA, etc.)
2. **Name** - Item instance name (distinguisher)
3. **Product Owners** - Associated owners with percentages
4. **Plan Number** - Account/policy/plan identifier
5. **Current Value** - Monetary value
6. **Correct as at** - Last updated date *(Note: conflicts with field requirement - needs clarification)*
7. **Mis Managed** - Managed/Unmanaged status

**Sorting Requirements:**
- **Default Order:** Most liquid assets → Least liquid assets → Liabilities
- **Product Owner Sorting:** Option to sort by product owners with joint/tenants in common at bottom
- **Custom Liquidity Ordering:** Use existing `asset_liquidity_rankings` table

**Card-Based Design Integration:**
- **Ultra-Thin Product Cards:** Sleek, compact cards optimized for maximum page density
- **Card Content:** Product name, current value, start date
- **Universal Expand Arrow:** All products have expandable functionality

**Managed Product Cards:**
- **Collapsed State:** Product name + current value + start date + expand arrow
- **Expanded State:** 
  - Same fund breakdown as current managed products tab implementation
  - Total revenue display
  - Existing managed product functionality preserved
- **Multiple Simultaneous Expansion:** Users can expand multiple products on same page

**Unmanaged Product Cards:**
- **Collapsed State:** Product name + current value + start date + expand arrow  
- **Expanded State:** Full JSON content display in organized format
- **Inline Edit Capability:** Edit button enables direct field editing within expanded card

**Interaction Requirements:**
- **Expand/Collapse Toggle:** Click arrow to expand/collapse individual products
- **Multi-Product View:** Multiple products can be expanded simultaneously for comparison
- **Persistent State:** Expanded/collapsed state maintained during session
- **Smooth Animations:** <200ms expand/collapse transitions for professional feel

### 2.2 Basic Details Table
**Columns Required:**
1. **Type** - Item type (Address, Email, Phone, etc.)
2. **Name** - Item instance identifier
3. **Product Owners** - Associated product owners
4. **Last Modified** - When item was last updated
5. **Expandable Content** - Click to see actual JSON information

**Interaction Requirements:**
- Minimal column view for space efficiency
- Full information available via row expansion

### 2.3 Protection Table
**Columns Required:**
1. **Provider** - Insurance provider name
2. **Cover Type** - Type of coverage (Life, Life & CI, CI, Income Protection, etc.)
3. **Policy Number** - Policy identifier
4. **Product Owners** - Associated owners
5. **Sum Assured** - Coverage amount
6. **Monthly Premium** - Payment amount

### 2.4 Income & Expenditure Table
**Columns Required:**
1. **Item Type** - Specific item type (Basic Salary, Income Tax, etc.)
2. **Name** - Item instance name
3. **Amount** - Monetary value
4. **Frequency** - Payment/receipt frequency
5. **Date** - Associated date
6. **Last Modified** - When item was last updated
7. **Expandable Notes** - Click to see notes content

### 2.5 Vulnerability & Health Cards
**Layout:** Product owner card-based layout (not table)

**Structure:**
- Each card represents one product owner
- Cards contain all health and vulnerability items for that owner
- Vertical scrolling through multiple product owner cards
- Click items within cards to expand and show JSON content

---

## 3. UI/UX Requirements

### 3.1 Modern Design Standards
**Visual Requirements:**
- Contemporary typography and color scheme
- Clean, professional interface suitable for wealth management
- Avoid "outdated/clunky" table feeling from current system
- Balance modern aesthetics with information density

### 3.2 Interaction Patterns
**Expandable Rows:**
- Click any row to expand and show detailed information
- Smooth expand/collapse animations
- Clear visual indication of expandable vs expanded state

**Inline Editing:**
- Edit button toggles inline editing mode for unmanaged products
- Save/Cancel actions clearly visible
- Real-time field validation
- Auto-save indication

### 3.3 Information Density
**Display Requirements:**
- Maximum rows visible on screen simultaneously
- Compact row height (32-40px range)
- Horizontal scrolling if necessary for wide tables
- Responsive design for different screen sizes

---

## 4. Data Field Requirements

### 4.1 Excluded Fields
**Remove from all item types:**
- ~~Status columns~~ - "Do not need to show status columns in tables for items"
- ~~Correct as at~~ - User feedback indicates removal *(conflicts with A&L table requirement)*
- ~~Start date~~ - Not needed per user feedback  
- ~~End date~~ - Not needed per user feedback

### 4.2 Required Fields
**Last Updated Field:**
- Include "Last Updated" field for all item types
- **Uncertainty:** Some users may want "Created as at" instead or both fields
- **Decision Required:** Clarify whether to include created date, updated date, or both

### 4.3 Item Identification
**Item Name as Unique Identifier:**
- Use item name to distinguish between items of same type
- Similar pattern to existing "product name" and "product type"
- Examples: "Barclays Current Account" vs "Savings Account" (both Cash Accounts)

---

## 5. Integration Requirements

### 5.1 Managed Products Integration
**Assets & Liabilities Page Merge:**
- Complete replacement of existing managed products tab with integrated card view
- Existing managed products functionality fully preserved within expanded cards
- Fund breakdown display maintained exactly as current implementation  
- Product overview page links preserved with arrow navigation
- Total revenue calculation added to existing fund data
- No loss of existing functionality or data access

### 5.2 Card-Based Data Integration
**Unified Product Display:**
- Both managed and unmanaged products displayed in same card format
- Managed products pull data from existing product/portfolio/fund tables
- Unmanaged products display data from `client_information_items` JSON content
- Consistent card appearance regardless of data source
- Real-time data synchronization for managed product values

**Data Source Mapping:**
```sql
-- Managed Products (existing data structure)
SELECT p.product_name, p.current_value, p.start_date, 
       fund_breakdown, total_revenue
FROM client_products p 
WHERE p.client_group_id = ?

-- Unmanaged Products (item types specification)  
SELECT item_type as product_name, 
       JSON_EXTRACT(data_content, '$.current_value') as current_value,
       JSON_EXTRACT(data_content, '$.start_date') as start_date,
       data_content as json_fields
FROM client_information_items 
WHERE client_group_id = ? AND category = 'assets_liabilities'
```

### 5.3 Database Architecture Integration
**Enhanced Compatibility:**
- Existing `client_information_items` table structure maintained
- Integration with `asset_liquidity_rankings` for unified ordering
- Compatibility with existing product, portfolio, and fund systems
- Shared sorting and filtering logic across managed/unmanaged products

---

## 6. Technical Specifications

### 6.1 Assets & Liabilities Card Layout Specifications

#### 6.1.1 Ultra-Thin Card Design
**Card Dimensions:**
- **Height (Collapsed):** 40-45px maximum for density optimization
- **Width:** Full container width with responsive breakpoints
- **Spacing:** 2-4px vertical gap between cards
- **Border Radius:** 4-6px for modern appearance

**Card Content Layout:**
```
[Product Name] ........................ [Current Value] [Start Date] [>]
```

**Typography:**
- **Product Name:** 14px font-weight 500, truncated with ellipsis if needed
- **Current Value:** 14px font-weight 600, right-aligned, currency formatted
- **Start Date:** 12px font-weight 400, muted color, MM/YYYY format
- **Expand Arrow:** 16px chevron icon, interactive state changes

#### 6.1.2 Managed Product Expanded State
**Expanded Card Structure:**
```
[Product Name] ........................ [Current Value] [Start Date] [v]
├── Fund Breakdown (existing implementation)
│   ├── Fund Name 1: £XX,XXX (XX%)  
│   ├── Fund Name 2: £XX,XXX (XX%)
│   └── [Additional funds...]
├── Total Revenue: £XX,XXX (+X.X%)
└── [Link to Product Overview] →
```

**Integration Requirements:**
- Preserve existing fund breakdown component exactly
- Add total revenue calculation and display
- Maintain link to product overview page
- Same data sources as current managed products tab

#### 6.1.3 Unmanaged Product Expanded State
**Expanded Card Structure:**
```
[Product Name] ........................ [Current Value] [Start Date] [v]
├── JSON Field Display:
│   ├── Provider: [Value] [Edit]
│   ├── Plan Number: [Value] [Edit]  
│   ├── Description: [Value] [Edit]
│   └── [Additional JSON fields...]
├── Notes: [Expandable text area] [Edit]
└── [Save Changes] [Cancel]
```

**Inline Editing Behavior:**
- Edit button toggles field to editable state
- Save/Cancel buttons appear when any field is modified
- Real-time validation for required fields
- Auto-save indication with success feedback

### 6.2 Performance Requirements
- Sub-500ms initial card rendering for 20+ cards
- <200ms expand/collapse animation duration  
- Lazy loading for expanded content with 100ms delay
- Virtual scrolling for 50+ cards
- Smooth scrolling with multiple expanded cards

### 6.3 Accessibility Requirements
- WCAG 2.1 AA compliance maintained
- Keyboard navigation: Tab/Enter to expand, Esc to collapse
- Screen reader announcements for expand/collapse actions
- ARIA labels for card states and interactive elements
- Focus management for inline editing modes

---

## 7. Questions Requiring Clarification

### 7.1 Date Field Conflict
**Issue:** User feedback says remove "correct as at" but A&L table spec includes it
**Question:** Should Assets & Liabilities table include "Correct as at" column or not?

### 7.2 Date Field Preference
**Issue:** Uncertainty about created vs updated date fields
**Question:** Should items include:
- Only "Last Updated" date?
- Only "Created at" date?
- Both dates?

### 7.3 Status Column Clarification
**Issue:** "Do not show status columns" but existing Phase 2 has status functionality
**Question:** Does this apply to:
- Visual status columns in tables only?
- Status functionality entirely?
- Specific status types?

---

## 8. Implementation Priority

### 8.1 Phase 2.1 - Assets & Liabilities Pilot
**Scope:** Single category implementation with hybrid card approach for user feedback
1. **Assets & Liabilities Hybrid Cards** - Ultra-thin card design with expand/collapse
2. **Managed/Unmanaged Product Integration** - Unified card display
3. **Start Date Field Addition** - Add to all A&L item types
4. **Inline Editing for Unmanaged Products** - Edit capability within expanded cards

### 8.2 Phase 2.2 - Feedback Integration & Planning
**Scope:** Based on Assets & Liabilities pilot feedback
1. **User Feedback Analysis** - Refine card approach based on testing
2. **Other Category Design Planning** - Determine approach for remaining Big 5
3. **Product Management Integration Planning** - Complex refactoring strategy
4. **Performance Optimization** - Based on pilot learnings

### 8.3 Phase 2.3 - Full Category Rollout
**Scope:** Apply refined approaches to remaining categories
1. **Basic Details Tables** - Traditional table approach with last_modified
2. **Protection Tables** - Table approach with Cover Type column
3. **Income & Expenditure Tables** - Item type-based classification
4. **Vulnerability & Health Cards** - Product owner card layout
5. **Advanced Features** - Filtering, sorting, bulk operations

---

This requirements specification transforms user feedback into actionable technical requirements while identifying areas needing clarification before implementation begins.