---
title: "Phase 2 User Workflows"
tags: ["phase2", "ux", "workflows", "user-experience"]
related_docs:
  - "../03_architecture/12_phase2_frontend_architecture.md"
  - "../03_architecture/11_phase2_api_endpoints.md"
  - "../03_architecture/10_phase2_database_schema.md"
---

# Phase 2 User Workflows

## Overview

This document defines the user experience workflows for Phase 2's enhanced client data management system, focusing on the **5-category approach** and **hybrid card/table interface**. All workflows are designed for wealth management advisors prioritizing **information density** and **data visibility** over aesthetic considerations.

---

## 5-Category Navigation Workflow

### Primary Navigation Structure

The Phase 2 enhancement replaces the single information items page with **5 specialized category pages**, each optimized for specific data types and advisor workflows.

#### Category Overview

| Category | Primary Use Case | Interface | Key Features |
|----------|-----------------|-----------|--------------|
| **Basic Details** | Personal and contact information management | Dense Table | Address management, phone numbers, personal data |
| **Income & Expenditure** | Financial flow analysis | Dense Table | Income/expenditure classification, frequency analysis |
| **Assets & Liabilities** | Portfolio visualization and management | **Ultra-Thin Cards** | Managed/unmanaged unification, financial summaries |
| **Protection** | Insurance policy management | Dense Table | Cover type emphasis, policy tracking |
| **Vulnerability & Health** | Risk assessment and health data | Product Owner Cards | Grouped by client, encrypted health data |

#### Navigation Workflow

```
Main Client Page
├── [Basic Details Tab]        → BasicDetailsTable (12+ rows)
├── [Income & Expenditure Tab] → IncomeExpenditureTable + Classification Filter
├── [Assets & Liabilities Tab] → Ultra-Thin Cards (UNIQUE interface)
├── [Protection Tab]           → ProtectionTable (Cover Type emphasis)
└── [Vulnerability & Health]   → Product Owner Grouped Cards
```

### Tab Switching Behavior

**Desktop Experience**:
1. **Click category tab** → Immediate category switch with loading skeleton
2. **Data preservation** → Previous category filters/searches maintained
3. **URL routing** → `/client/{id}/basic_details`, `/client/{id}/assets_liabilities`, etc.
4. **Performance** → Sub-500ms category switching with cached data

**Mobile Experience**:
1. **Category dropdown** → Replaces tabs on screens <768px
2. **Touch-optimized** → Large touch targets for category selection
3. **Simplified view** → Reduced column count, maintained row density

### State Management Across Categories

**Preserved State**:
- Search queries within each category
- Filter selections (priority, status, etc.)
- Sort preferences (updated_at, name, amount)
- Pagination position

**Reset State**:
- Expanded card states (Assets & Liabilities only)
- Selected items for bulk operations
- Inline editing modes

---

## Assets & Liabilities Card Interaction

### Card-Based Workflow (UNIQUE to Assets & Liabilities)

The **Assets & Liabilities category** is the ONLY category using a card interface, specifically designed for financial product visualization and managed/unmanaged product unification.

#### Ultra-Thin Card Format

**Card Display Structure**: `[Product Name] + [Current Value] + [Start Date] + [>]`

```
┌─────────────────────────────────────────────────────────────┐
│ Halifax Current Account        £2,500.00    15/03/2020    > │  ← 32-40px height
├─────────────────────────────────────────────────────────────┤
│ Aviva Pension Plan            £125,000.00   01/04/2015    > │
├─────────────────────────────────────────────────────────────┤
│ Barclays Mortgage            -£280,000.00   01/06/2018    > │
└─────────────────────────────────────────────────────────────┘
```

#### Card Interaction Workflow

**Collapsed State (Default)**:
1. **Scan and identify** → Quick visual scanning of all products
2. **Financial summary** → Instant overview of total assets/liabilities
3. **Start date prominence** → Historical context for each product
4. **Managed vs unmanaged** → Visual indicators for sync status

**Expanded State (Detailed View)**:
1. **Click anywhere on card** → Card expands to show full details
2. **Inline editing** → Direct editing for unmanaged products
3. **Managed product sync** → Conflict resolution interface if needed
4. **Full product details** → Account numbers, ownership percentages, notes

#### Managed/Unmanaged Product Unification

**Workflow for Product Conflicts**:
1. **Conflict detection** → System identifies products in both systems
2. **Visual conflict indicator** → Warning icon on card
3. **Conflict resolution UI** → Side-by-side comparison
4. **User decision** → Choose managed, unmanaged, or merge
5. **Sync confirmation** → Confirm resolution and update

**Inline Editing for Unmanaged Products**:
1. **Expand card** → Click to show detailed view
2. **Edit mode** → Click edit button or inline edit fields
3. **Real-time validation** → Immediate feedback on field validation
4. **Auto-save** → Changes saved automatically with conflict detection
5. **Visual feedback** → Success/error indicators for save operations

#### Virtual Scrolling for Large Portfolios

**Performance Optimization**:
- **Activation threshold**: 100+ items
- **Card height**: 40px collapsed, 320px expanded
- **Memory management**: 1000+ items supported
- **Smooth scrolling**: 60fps performance maintained

**User Experience**:
1. **Automatic activation** → No user action required
2. **Seamless scrolling** → No performance degradation
3. **Expanded card handling** → Dynamic height calculation
4. **Search and filter** → Works within virtualized view

---

## Basic Details Table Workflow

### Standard Table Interface

Basic Details uses the **standard dense table interface** optimized for personal and contact information management.

#### Table Structure

| Column | Purpose | Sorting | Features |
|--------|---------|---------|----------|
| **Type** | Item type (Address, Phone Number, etc.) | Yes | Grouped by type |
| **Name** | Instance identifier | Yes | Custom names |
| **Summary** | Brief description | No | Truncated with expand |
| **Last Modified** | Timestamp | Yes (default) | Relative time display |
| **Priority** | Visual priority indicator | Yes | Color-coded badges |
| **Status** | Current status | Yes | Status badges |
| **Actions** | Edit/Delete operations | No | Hover-activated |

#### Workflow Patterns

**Address Management**:
1. **Add new address** → Click "Add Address" button
2. **Address type selection** → Primary, Secondary, Business, etc.
3. **Address validation** → Postcode validation, address lookup
4. **Multiple addresses** → Support for multiple addresses per type

**Phone Number Management**:
1. **Add phone number** → Click "Add Phone" button
2. **Phone type selection** → Mobile, House Phone, Work, Other
3. **Primary designation** → Set primary contact number
4. **International format** → Automatic formatting and validation

**Data Entry Optimization**:
1. **Inline editing** → Click any cell to edit directly
2. **Tab navigation** → Quick movement between fields
3. **Auto-save** → Changes saved automatically
4. **Validation feedback** → Immediate error/success feedback

---

## Income & Expenditure Classification Workflow

### Table with Classification Filter

Income & Expenditure combines **dense table display** with **classification filtering** for comprehensive financial flow analysis.

#### Classification Filter Bar

```
┌────────────────────────────────────────────────────────────┐
│ [All (24)] [Income (£52,000)] [Expenditure (£28,000)]     │
└────────────────────────────────────────────────────────────┘
```

**Filter Workflow**:
1. **Default view** → All items displayed with totals
2. **Income filter** → Shows only income items + annual total
3. **Expenditure filter** → Shows only expenditure items + annual total
4. **Dynamic totals** → Real-time calculation updates

#### Item Type Classification

**Automatic Classification**:
- **Income Items**: Basic Salary, Bonuses, Dividends, Rental Profit, etc.
- **Expenditure Items**: Rent, Council Tax, Utilities, Transport, etc.
- **Visual Indicators**: Green badges for income, red badges for expenditure

**Data Entry Workflow**:
1. **Add income/expenditure** → Select appropriate item type
2. **Classification assignment** → Automatic based on item type
3. **Amount and frequency** → Required fields with validation
4. **Product owner assignment** → Link to specific client/owner
5. **Frequency normalization** → System calculates annual equivalents

#### Financial Analysis Features

**Summary Calculations**:
- **Total Annual Income**: Real-time aggregation
- **Total Annual Expenditure**: Real-time aggregation  
- **Net Annual Position**: Automatic calculation
- **Monthly Averages**: Breakdown by frequency

**Workflow Integration**:
1. **Quick assessment** → Instant financial position overview
2. **Detailed analysis** → Drill down into specific items
3. **Trend monitoring** → Historical comparison capabilities
4. **Report integration** → Export to financial planning reports

---

## Protection Policy Management Workflow

### Cover Type Emphasis (Not Policy Type)

Protection policy management emphasizes **Cover Type** over Policy Type to align with user requirements and advisor workflows.

#### Table Structure with Cover Type Prominence

| Column | Display Priority | Purpose |
|--------|-----------------|---------|
| **Policy Name** | High | User-defined identifier |
| **Cover Type** | **HIGHEST** | Term Life, Whole of Life, Critical Illness, etc. |
| **Provider** | Medium | Insurance company |
| **Sum Assured** | High | Coverage amount |
| **Premium** | High | Cost information |
| **Frequency** | Medium | Payment schedule |
| **Last Modified** | Low | Update tracking |

#### Cover Type Workflow

**Policy Creation**:
1. **Cover type selection** → Primary field, prominently displayed
2. **Conditional fields** → Fields shown/hidden based on cover type
3. **Term policies** → Show policy end date
4. **Whole of life** → Hide policy end date
5. **Critical illness** → Show condition coverage details

**Policy Management**:
1. **Cover type filtering** → Filter by specific cover types
2. **Coverage analysis** → Total coverage by type
3. **Premium analysis** → Annual premium costs
4. **Renewal tracking** → Policy expiration dates

#### Product Owner Integration

**Joint Policies**:
1. **Multiple owners** → Support for joint policies
2. **Ownership percentages** → Must total 100%
3. **Beneficiary designation** → Link to product owners
4. **Coverage allocation** → Split coverage amounts

---

## Vulnerability & Health Product Owner Grouping

### Card-Based Display Grouped by Product Owner

Vulnerability & Health uses a **product owner card-based layout** for organizing health and risk assessment information by individual clients.

#### Product Owner Group Structure

```
┌─────────────────────────────────────────────────────────────┐
│ John Smith                                    3 items       │
├─────────────────────────────────────────────────────────────┤
│  ├── Risk Questionnaire - Family (Annual Risk Assessment)   │
│  ├── Manual Risk Assessment - Family (Investment Review)    │
│  └── Health Issues (Medical Conditions) [ENCRYPTED]         │
└─────────────────────────────────────────────────────────────┘
```

#### Workflow Patterns

**Product Owner Organization**:
1. **Automatic grouping** → Items grouped by associated product owner
2. **Individual sections** → Each owner gets dedicated section
3. **Item count indicators** → Show number of items per owner
4. **Ungrouped items** → General items not linked to specific owners

**Health Data Handling**:
1. **Encryption indicators** → Clear visual indicators for encrypted data
2. **Access control** → Permission-based access to sensitive information
3. **Audit logging** → All access to health data logged
4. **Secure display** → Encrypted data shown only to authorized users

**Risk Assessment Workflow**:
1. **Questionnaire completion** → Guided risk assessment process
2. **Score calculation** → Automatic risk score generation
3. **Category assignment** → Conservative, Balanced, Aggressive, etc.
4. **Review scheduling** → Annual review reminders
5. **Historical comparison** → Track risk tolerance changes over time

#### Health Issues Management

**Encrypted Health Data**:
1. **Secure entry** → Encrypted at field level during input
2. **Authorized access** → Role-based permissions for viewing
3. **Audit trail** → Complete access history maintained
4. **Compliance features** → GDPR and medical privacy compliance

**Medical Conditions Tracking**:
1. **Condition summary** → High-level health overview
2. **Last updated tracking** → Currency of medical information
3. **Review scheduling** → Medical review reminders
4. **Professional notes** → Advisor observations and recommendations

---

## Cross-Category Workflows

### Universal Patterns Across All Categories

#### Search and Filter Operations

**Global Search**:
1. **Category-specific search** → Search within current category
2. **Real-time filtering** → Results update as user types
3. **Search highlighting** → Matched terms highlighted in results
4. **Search history** → Recent searches available

**Advanced Filtering**:
1. **Priority filtering** → Filter by low, standard, high, critical
2. **Status filtering** → Filter by current, outdated, pending review, etc.
3. **Date range filtering** → Filter by last modified dates
4. **Combined filters** → Multiple filters applied simultaneously

#### Data Entry and Validation

**Form Validation**:
1. **Real-time validation** → Immediate feedback on field errors
2. **Required field indicators** → Clear visual indicators
3. **Format validation** → Currency, date, percentage validation
4. **Business rule validation** → Ownership percentages, date logic

**Auto-Save and Conflict Resolution**:
1. **Automatic saving** → Changes saved without explicit save action
2. **Conflict detection** → Multiple user editing detection
3. **Merge assistance** → Guided conflict resolution
4. **Version history** → Track changes over time

#### Bulk Operations

**Multi-Item Selection**:
1. **Checkbox selection** → Select multiple items for bulk operations
2. **Select all/none** → Quick selection controls
3. **Bulk editing** → Edit multiple items simultaneously
4. **Bulk deletion** → Delete multiple items with confirmation

**Export and Reporting**:
1. **Category export** → Export current category data
2. **Filtered export** → Export only filtered results
3. **Format options** → CSV, PDF, Excel export formats
4. **Report integration** → Include in comprehensive client reports

---

## Mobile and Responsive Workflows

### Mobile-Optimized Experience

#### Navigation Adaptation

**Mobile Navigation** (<768px):
1. **Category dropdown** → Replaces tab navigation
2. **Touch targets** → Larger buttons and interactive elements
3. **Swipe gestures** → Swipe between categories
4. **Simplified menus** → Reduced menu complexity

#### Table Responsiveness

**Column Prioritization**:
1. **Primary columns** → Essential data always visible
2. **Secondary columns** → Hidden on smaller screens
3. **Detail expansion** → Tap to see hidden columns
4. **Horizontal scrolling** → For complex tables when needed

#### Card Interface Adaptation

**Assets & Liabilities Mobile**:
1. **Stacked layout** → Cards stack vertically
2. **Touch expansion** → Tap to expand cards
3. **Swipe actions** → Swipe for edit/delete
4. **Gesture feedback** → Visual feedback for touch interactions

---

## Accessibility Workflows

### WCAG 2.1 AA Compliance

#### Keyboard Navigation

**Table Navigation**:
1. **Tab order** → Logical tab sequence through table
2. **Arrow key navigation** → Move between cells with arrow keys
3. **Enter key activation** → Activate buttons and links
4. **Escape key** → Cancel operations and close dialogs

#### Screen Reader Support

**Information Density Accessibility**:
1. **Table headers** → Clear row and column headers
2. **Cell context** → Screen reader announces cell context
3. **Summary information** → Table summaries for context
4. **Progress indicators** → Loading and completion status

#### Visual Accessibility

**High Contrast Support**:
1. **Color blind friendly** → Color combinations tested
2. **Focus indicators** → Clear visual focus indicators
3. **Text scaling** → Support for text size increases
4. **Motion preferences** → Respect user motion preferences

---

## Performance and User Experience

### Information Density Optimization

#### Loading Performance

**Progressive Loading**:
1. **Skeleton screens** → Show layout while loading
2. **Incremental loading** → Load data in chunks
3. **Cache optimization** → Cache frequently accessed data
4. **Error recovery** → Graceful handling of loading failures

#### User Feedback

**Visual Feedback**:
1. **Loading indicators** → Progress bars and spinners
2. **Success confirmations** → Green checkmarks for successful operations
3. **Error notifications** → Clear error messages with resolution steps
4. **Auto-hide notifications** → Temporary notifications fade automatically

#### Performance Monitoring

**User Experience Metrics**:
1. **Page load times** → Sub-500ms target for category switching
2. **Interaction responsiveness** → <100ms response to user actions
3. **Virtual scrolling performance** → Smooth 60fps scrolling
4. **Memory usage** → Efficient memory management for large datasets

---

## Conclusion

Phase 2 user workflows prioritize **information density** and **professional efficiency** over aesthetic considerations, providing wealth management advisors with powerful tools for comprehensive client data management. The **5-category approach** with **hybrid interface strategy** ensures optimal user experience for each data type while maintaining consistency across the application.

Key workflow principles:
- **Category-specific optimization** for different data types
- **Information density** with professional interface standards
- **Managed/unmanaged integration** for seamless product management
- **Accessibility and performance** as core requirements
- **Mobile responsiveness** without compromising data visibility