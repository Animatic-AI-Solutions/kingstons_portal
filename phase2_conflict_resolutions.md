# Phase 2 Conflict Resolutions
**Based on User Clarifications**  
**Date:** September 5, 2025  
**Status:** Conflicts Resolved - Ready for Implementation

---

## Resolved Conflicts

### ✅ **1. Date Fields Resolution**
**Decision:** 
- **Assets & Liabilities only**: Include `start_date` field
- **All other categories**: Use `last_modified` field only

**Implementation:**
- Assets & Liabilities cards: `[Product Name] + [Current Value] + [Start Date] + [>]`
- All other item types: Include `last_modified` timestamp, no start_date

### ✅ **2. Hybrid Card Approach Scope**
**Decision:** 
- **Phase 2.1**: Only implement hybrid modern card approach for Assets & Liabilities
- **Purpose**: Get user feedback before implementing across all Big 5 categories
- **Other Categories**: Maintain existing or simpler table approaches for now

### ✅ **3. Income/Expenditure Classification**
**Clarification:**
- `income_expenditure` is a Big 5 category, not an item type ✓
- Individual item types: Basic Salary, Income Tax, Salary Sacrifice, etc.
- No need for "Income/Expenditure" classification field within items

### ✅ **4. Policy Type Field**
**Clarification:**
- No "Policy Type" field exists in item types specification ✓
- Protection Policy has "Cover Type" and "Term Type" fields
- User Requirements table column structure needs adjustment

### ✅ **5. Field Value Standardization**
**Decision:**
- **Do NOT standardize** Current Value, Amount, Sum Assured
- These represent different concepts and should remain distinct
- Card display will use appropriate field for each item type

### ✅ **6. Product Management Integration**
**Acknowledgment:**
- Refactoring current product management system is complex
- Still requires separate planning phase
- Not part of immediate Phase 2.1 implementation

---

## Updated Implementation Plan

### **Phase 2.1: Assets & Liabilities Pilot**
**Scope:** Single category implementation with hybrid card approach

**Card Structure for Assets & Liabilities:**
```
[Product Name] ........................ [Current Value/Amount/Sum Assured] [Start Date] [>]
```

**Expanded State:**
- **Managed Products**: Fund breakdown + total revenue (existing functionality)
- **Unmanaged Products**: JSON field display with inline editing

### **Phase 2.2: Feedback Integration**
**Scope:** Based on Assets & Liabilities feedback
- Refine card approach based on user testing
- Plan rollout to other Big 5 categories
- Address product management integration planning

### **Phase 2.3: Full Category Rollout**
**Scope:** Apply refined approach to remaining categories
- Basic Details: Simple table approach (non-card)
- Protection: Table approach with appropriate columns
- Income & Expenditure: Table approach with item-specific fields
- Vulnerability & Health: Product owner card layout

---

## Updated Requirements Specifications

### **Assets & Liabilities Table (Hybrid Cards)**
**Card Fields Required:**
- Product Name (from `name` field or item_type)
- Current Value/Amount/Sum Assured (item-specific field)
- Start Date (new field to add to relevant item types)
- Expand/Collapse functionality

**Item Types Requiring Start Date Addition:**
- Cash Accounts ← ADD start_date
- Premium Bonds ← ADD start_date  
- All ISA types ← ADD start_date
- Investment Bonds ← ADD start_date
- Individual Shares ← ADD start_date
- Personal/Workplace Pensions ← ADD start_date
- All Liability types ← ADD start_date

### **Other Categories (Non-Card Approach)**
**Date Field:** `last_modified` only
**Display:** Traditional table layouts
**Implementation:** Phase 2.2+ based on A&L feedback

---

## Technical Implementation Notes

### **Assets & Liabilities Card Data Mapping**
```javascript
// Unified card data structure
const cardData = {
  productName: item.name || item.item_type,
  currentValue: item.data_content.current_value || 
                item.data_content.amount || 
                item.data_content.sum_assured,
  startDate: item.data_content.start_date, // NEW field
  isManaged: item.managed_product_id ? true : false,
  expandedContent: item.isManaged ? 
    { type: 'fund_breakdown', data: managedProductData } :
    { type: 'json_fields', data: item.data_content }
}
```

### **Item Types Schema Updates Required**
Add `start_date` field to all assets & liabilities item types:
```json
{
  "start_date": "2024-01-15", // DD/MM/YYYY format
  "current_value": 25000.00,
  // ... other existing fields
}
```

---

## Outstanding Planning Items

### **Product Management Integration (Future Phase)**
**Complexity Areas:**
- Unifying managed/unmanaged data sources in single card view
- Maintaining existing fund breakdown functionality
- Performance optimization for mixed data queries
- Migration strategy for existing managed products

**Requires Separate Planning:**
- Database schema analysis
- API endpoint restructuring
- Frontend component architecture
- Data migration strategy
- User training and transition plan

---

This resolution document addresses all identified conflicts and provides clear implementation guidance for Phase 2.1 focused on Assets & Liabilities pilot with hybrid card approach.