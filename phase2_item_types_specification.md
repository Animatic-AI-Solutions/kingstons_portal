# Phase 2 Item Types Specification

## Overview

This document defines comprehensive item types for Phase 2 of Kingston's Portal, organized by client group type and category. Each item type includes field specifications, validation rules, and UI requirements.

## Generic Features (All Item Types)

### Date Fields
- **Format**: DD/MM/YYYY
- **Input Options**: 
  - Type directly (with/without slashes)
  - Shortcuts: T (Today), T+ (Tomorrow), T- (Yesterday)
  - No dropdown calendar required
- **Validation**: Date format validation

### Address Block Structure
- **Components**: 2 address lines + Postcode field (aligned with Phase 2 architecture)
- **Validation**: Postcode format validation
- **Lines**: Each line is a text input field
- **Required**: Address line one and postcode typically required

#### Standardized JSON Format for Address Block
```json
{
  "address_line_one": "123 High Street",    // Building number and street
  "address_line_two": "Manchester",         // Town/city/area (optional)
  "postcode": "M1 1AA"                      // Postcode (required)
}
```

**Examples:**
```json
// Simple address
{
  "address_line_one": "10 Downing Street",
  "address_line_two": "London",
  "postcode": "SW1A 2AA"
}

// Complex address
{
  "address_line_one": "Flat 2B, Rose Court, 15-17 Victoria Road",
  "address_line_two": "Kensington, London", 
  "postcode": "SW7 1HL"
}
```

### Notes Fields
- **Type**: Text area (Free Type Box)
- **Purpose**: Allow free-form notes for any entry
- **Required**: Optional for all items

### Dropdown Enhancement
- **Requirement**: All dropdowns include an "Other" option where users can type custom answers
- **Auto-Add Functionality**: Any new answer typed in is automatically added to the dropdown options list for future use
- **UI**: "Other" option in all dropdowns with text input field, dynamically expanding dropdown lists

### Currency Input Validation
- **Precision**: 2 decimal places
- **Range**: No negative numbers allowed
- **Format**: Standard currency formatting with appropriate symbol

### Percentage Input Validation
- **Range**: 0 to 100 (inclusive)
- **Precision**: Up to 2 decimal places
- **Format**: Displayed with % symbol

### Product Owner Relationships
- **Selection**: Multiple product owners can be selected per item
- **Relationship Type**: Must specify if relationship is "Joint Tenants" or "Tenants in Common"
- **Ownership Percentages**: Always required for each selected product owner, must total 100% (applies to both Joint Tenants and Tenants in Common)
- **Inline Creation**: New product owners can be created inline when adding them to an item

#### Standardized JSON Format for Product Owner Relationships
```json
{
  "associated_product_owners": {
    "association_type": "tenants_in_common", // or "joint_tenants"
    "123": 60.00, // product_owner_id: percentage
    "456": 40.00  // percentages must total 100.00
  }
}
```

**Examples:**
```json
// Joint ownership example
{
  "associated_product_owners": {
    "association_type": "joint_tenants", 
    "123": 50.00,
    "456": 50.00
  }
}

// Complex tenants in common
{
  "associated_product_owners": {
    "association_type": "tenants_in_common",
    "123": 70.00,
    "456": 25.00, 
    "789": 5.00
  }
}
```

### Security and Encryption Requirements

#### Field-Level Encryption (AES-256-GCM)
The following fields require encryption when stored in the database:

**High Sensitivity - Always Encrypted:**
- **3 Words & Share With**: Full content encrypted
- **Vulnerable Details**: Full content encrypted  
- **Vulnerability Adjustments Details**: Full content encrypted
- **Health Issues Details**: Full content encrypted
- **Medication Details**: Full content encrypted
- **Notes fields**: All notes fields across all item types
- **NI Numbers**: Complete encryption of format XX 11 12 13 G
- **Account Numbers**: All financial account identifiers
- **Policy Numbers**: Insurance and protection policy identifiers
- **Plan Numbers**: Pension and investment plan identifiers
- **Reference Numbers**: Defined benefit scheme references
- **Companies House Registration Numbers**: Business registration details
- **Trust Registration Numbers**: Trust service registration details

**Medium Sensitivity - Conditionally Encrypted:**
- **Phone Numbers**: All phone number values
- **Email Addresses**: All email values
- **Previous Names**: Full content encrypted
- **Financial Values**: All monetary amounts above £100,000
- **Shareholding Details**: Ownership percentages and amounts
- **Business Valuations**: Company valuation amounts

**Business Logic:**
- Encryption/decryption handled transparently at application level
- All access to encrypted fields logged to `product_owners_audit_log`
- Business justification required for accessing encrypted fields
- Automatic audit logging for create/update/delete/view operations

#### Audit Trail Requirements
All sensitive item type changes must be logged:
```json
{
  "field_changed": "vulnerable_details",
  "change_type": "update", 
  "business_justification": "Annual review update",
  "item_type": "vulnerability_health",
  "item_category": "Health Issues",
  "encrypted": true,
  "access_level": "high_sensitivity"
}
```

### Validation Rules and Database Constraints

#### Field Validation Alignment
All item type validations must align with existing Phase 2 database constraints:

**String Length Constraints:**
- **Text Inputs**: 255 character maximum (database VARCHAR limit)
- **Text Areas**: 10,000 character maximum (database TEXT limit)
- **Email Fields**: 320 character maximum (RFC standard)
- **Phone Numbers**: 20 character maximum including formatting
- **Postcode Fields**: 10 character maximum (UK postcode standard)

**Numeric Validation:**
- **Currency Fields**: DECIMAL(15,2) - maximum £999,999,999,999.99
- **Percentage Fields**: DECIMAL(5,2) - range 0.00 to 100.00
- **Integer Fields**: INT type - maximum 2,147,483,647
- **Year Fields**: SMALLINT - range 1900 to 2100

**Date Validation:**
- **Date Range**: 1900-01-01 to 2100-12-31 (database DATE constraints)
- **Future Dates**: Allow for planning purposes (maturity dates, end dates)
- **Historical Dates**: Allow for birth dates, inception dates
- **Required Format**: DD/MM/YYYY with automatic conversion to ISO format for database storage

**JSON Field Constraints:**
- **Address JSON**: Maximum 6 fields (5 lines + postcode)
- **Product Owner JSON**: Maximum 10 associated owners per item
- **Percentage Totals**: Must validate to exactly 100.00 for ownership splits

**Dropdown Validation:**
- **Enum Constraints**: All dropdown values must match database ENUM definitions
- **Custom Values**: "Other" selections stored in separate overflow field
- **Auto-Add Logic**: New dropdown values require admin approval before permanent addition

#### Database Integration Constraints
- **Foreign Key Relationships**: All product_owner_id references must exist in product_owners table
- **Client Group Validation**: Item types must match allowed types for client group type
- **Unique Constraints**: Some item types limited to one per client (e.g., NI Number)
- **Conditional Requirements**: Database triggers enforce conditional field logic
- **Audit Logging**: All changes automatically logged to client_information_items_audit table

### Conditional Field Logic
- **Relationship Status**: When "Married" is selected, "Marriage Date" and "Married To" fields appear and become conditional requirements
- **Other Status Types**: When "Widowed", "Divorced", "Legally Separated", or "Civil Partnership" selected, corresponding date fields appear
- **Vulnerability Fields**: When "Vulnerable" = Yes, "Vulnerable Details" becomes conditionally required
- **Vulnerability Adjustments**: When "Vulnerability Adjustments Required" = Yes, "Vulnerability Adjustments Details" becomes conditionally required
- **Health Issues**: When "Health Issues" = Yes, "Health Issues Details" becomes conditionally required
- **Medication**: When "Medication" = Yes, "Medication Details" becomes conditionally required
- **Special Features (Pensions)**: When "Special Features" = Yes, "Special Features Details" becomes conditionally required
- **Investment Element (Protection)**: When "Investment Element" = Yes, both "Surrender Value" and "Date of Value" become conditionally required
- **Meeting Booking**: No conditional logic - if booked, assume it's for the expected month

---

## Client Group Types

### 1. Family Client Group Type
### 2. Business Client Group Type  
### 3. Trust Client Group Type

---

## Database Architecture Integration

### Field Structure Alignment
Each item in the database follows this structure:

```sql
client_information_items (
  id SERIAL PRIMARY KEY,
  client_group_id INTEGER REFERENCES client_groups(id),
  item_type VARCHAR(100) NOT NULL, -- Specific item name (e.g., "Phone Number", "Address", "Basic Salary")
  category VARCHAR(50) NOT NULL CHECK (
    category IN ('basic_detail', 'income_expenditure', 'assets_liabilities', 'protection', 'vulnerability_health')
  ), -- Big 5 category
  name VARCHAR(255), -- Instance name to distinguish multiple items of same item_type
  data_content JSON NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW() -- Used as last_modified for non-assets_liabilities
);
```

**Field Usage by Category:**
- **assets_liabilities**: Includes `start_date` in JSON data_content + updated_at
- **All other categories**: Only uses updated_at as last_modified timestamp
- **Card Display**: Assets & Liabilities cards show start_date from JSON + current_value/amount/sum_assured

### Big 5 Category System Integration

All item types are organized into one of the **Big 5 categories** (`category` field):

### 1. **basic_detail** (category)
**Family Groups** (item_type values): 
- Basic Personal Details, Address, Email Address, Phone Number, Special Relationships, Client Management, Meeting Schedule
- Client Declaration, Privacy Declaration, 3 Words & Share With, Ongoing Fee Agreement, AML Check
- Driving Licence, Passport, Other ID, Wills & Powers of Attorney

**Business Groups** (item_type values): 
- Business Name, Companies House Registration, Company Address, Business Inception, Business Type, Business Valuation
- Director Details, Shareholder Details, Lead Adviser, Client Start Date, Meeting Schedule Per Year, Company ID

**Trust Groups** (item_type values): 
- Trust Name, Trust Type, Trust Registration, Settlor Details, Beneficiary Details
- Lead Trustee Address, Trust Start Date, Trustee Details

### 2. **income_expenditure** (category)
**All Client Groups** (item_type values): 
- Basic Salary, Bonuses/Commissions, Benefits in Kind, State Pension, Drawdown Income, UFPLS
- Annuities, State Benefit - Taxable, State Benefit - Non-Taxable, Rental Profit, Interest, Dividends
- Non-Taxable Income, Chargeable Event, Other Income, Income Tax, Salary Sacrifice

### 3. **assets_liabilities** (category)
**All Client Groups** (item_type values): 
- **Assets**: Cash Accounts, Premium Bonds, Cash ISA, Stocks and Shares ISA, General Investment Account
- Onshore Investment Bond, Offshore Investment Bond, Individual Shares, Personal Pensions (Unmanaged), Workplace Pensions (Unmanaged)
- Defined Benefit Pensions, EIS/VCT/ITS, Whole of Life Plans, Land and Property, Other Assets
- **Liabilities**: Mortgage, Loans, Car Finance, Family Debts, Credit Cards, Student Loans, Tax Debt

*Note: Managed pensions are handled through the existing product management system*

### 4. **protection** (category)
**All Client Groups** (item_type values): Protection Policy

### 5. **vulnerability_health** (category)
**All Client Groups** (item_type values): 
- Risk Questionnaire (Family/Business/Trust versions)
- Manual Risk Assessment (Family/Business/Trust versions)
- Capacity for Loss
- Health Information (for Family groups)
- Vulnerability Information (for Family groups)

### Item Naming Convention
Each item instance includes a `name` field to distinguish multiple items of the same item_type:

**Examples:**
- **item_type**: "Phone Number" → **name**: "Primary Mobile", "Work Phone", "Emergency Contact"
- **item_type**: "Address" → **name**: "Main Residence", "Work Address", "Previous Address"
- **item_type**: "Email Address" → **name**: "Personal Email", "Work Email", "Secondary Email"
- **item_type**: "Basic Salary" → **name**: "Main Employment", "Part-time Job", "Consulting Income"  
- **item_type**: "Cash Accounts" → **name**: "Barclays Current Account", "Savings Account", "Joint Emergency Fund"

---

# FAMILY CLIENT GROUP TYPE

## Basic Details - Product Owner Details

### Basic Personal Details

*Note: Basic Personal Details define Product Owners in the system and are NOT item types within client groups. Product owners are created separately and then referenced in client group items.*

| Field | Type | Options/Validation | Required |
|-------|------|-------------------|----------|
| **Title** | Dropdown + Custom | Mr, Mrs, Miss, Dr, Other (Free Type Box) | Yes |
| **Forename** | Text Input | Standard text validation | Yes |
| **Middle Names** | Text Input | Standard text validation (multiple names in one string) | No |
| **Surname** | Text Input | Standard text validation | Yes |
| **Known As** | Text Input | Standard text validation | No |
| **Date of Birth** | Date Field | DD/MM/YYYY with shortcuts | Yes |
| **Previous Name(s)** | Text Area | Multiple names allowed | No |
| **Last Modified** | Timestamp | Auto-generated on save | System |

### Address Item Type
**item_type:** `Address`
**category:** `basic_detail`

| Field | Type | Options/Validation | Required |
|-------|------|-------------------|----------|
| **Name** | Text Input | Instance identifier (e.g., "Main Residence", "Work Address", "Previous Address") | Yes |
| **Product Owners** | Multi-select Dropdown | Select multiple product owners | Yes |
| **Address Line One** | Text Input | Building number and street | Yes |
| **Address Line Two** | Text Input | Town/city/area | No |
| **Postcode** | Text Input | UK postcode format validation | Yes |
| **Notes** | Text Area | Free text notes | No |
| **Last Modified** | Timestamp | Auto-generated on save | System |

### Email Address Item Type
**item_type:** `Email Address`
**category:** `basic_detail`

| Field | Type | Options/Validation | Required |
|-------|------|-------------------|----------|
| **Name** | Text Input | Instance identifier (e.g., "Personal Email", "Work Email", "Secondary Email") | Yes |
| **Product Owners** | Multi-select Dropdown | Select multiple product owners | Yes |
| **Email Address** | Email Input | Email validation | Yes |
| **Notes** | Text Area | Free text notes | No |

### Personal Details

| Field | Type | Options/Validation | Required |
|-------|------|-------------------|----------|
| **Gender** | Dropdown + Custom | Male, Female, Other (Free Type Box) | No |
| **Relationship Status** | Dropdown + Custom | Single, Married, Cohabiting, Widowed, Divorced, Legally Separated, Civil Partnership, Other (Free Type Box) | No |
| **Marriage Date** | Date Field | DD/MM/YYYY with shortcuts (appears when Married selected) | Conditional |
| **Married To** | Text Input | Free text or link to product owner (appears when Married selected) | Conditional |
| **Widowed Date** | Date Field | DD/MM/YYYY with shortcuts (appears when Widowed selected) | Conditional |
| **Divorce Date** | Date Field | DD/MM/YYYY with shortcuts (appears when Divorced selected) | Conditional |
| **Legal Separation Date** | Date Field | DD/MM/YYYY with shortcuts (appears when Legally Separated selected) | Conditional |
| **Civil Partnership Date** | Date Field | DD/MM/YYYY with shortcuts (appears when Civil Partnership selected) | Conditional |
| **NI Number** | Text Input | Format: XX 11 12 13 G | No |

### Health Information
**item_type:** `Health Information`  
**category:** `vulnerability_health`

| Field | Type | Options/Validation | Required |
|-------|------|-------------------|----------|
| **Name** | Text Input | Instance identifier (e.g., "Current Health Status", "Health Update") | Yes |
| **Health Issues** | Dropdown | Yes, No | No |
| **Health Issues Details** | Text Area | Free text description (appears when Health Issues = Yes) | Conditional |
| **Medication** | Dropdown | Yes, No, N/A | No |
| **Medication Details** | Text Area | Free text description (appears when Medication = Yes) | Conditional |
| **Smoker Status** | Dropdown | Smoker, Non-smoker, Previous Smoker, Vaping | No |
| **Smoker Status Details** | Text Area | Free text description for any smoker status | No |
| **Notes** | Text Area | Free text notes | No |

### Vulnerability Information
**item_type:** `Vulnerability Information`  
**category:** `vulnerability_health`

| Field | Type | Options/Validation | Required |
|-------|------|-------------------|----------|
| **Name** | Text Input | Instance identifier (e.g., "Vulnerability Assessment", "Support Needs") | Yes |
| **Vulnerable** | Dropdown | Yes, No | No |
| **Vulnerable Details** | Text Area | Free text description (appears when Vulnerable = Yes) | Conditional |
| **Vulnerability Adjustments Required** | Dropdown | Yes, No | No |
| **Vulnerability Adjustments Details** | Text Area | Free text description (appears when Vulnerability Adjustments Required = Yes) | Conditional |
| **Notes** | Text Area | Free text notes | No |

### Employment

| Field | Type | Options/Validation | Required |
|-------|------|-------------------|----------|
| **Employment Status** | Dropdown | Employed – Full Time, Employed – Part Time, Self Employed, Unemployed, Retired, Company Director – Own Company | No |
| **Occupation** | Text Area | Free text description | No |

### Special Relationships

| Field | Type | Options/Validation | Required |
|-------|------|-------------------|----------|
| **Full Name** | Text Input | Standard text validation | No |
| **Professional Firm** | Text Input | Standard text validation | No |
| **Date of Birth** | Date Field | DD/MM/YYYY with shortcuts | No |
| **Relationship** | Text Area | Free text description | No |
| **Dependent** | Dropdown | Yes, No | No |
| **Contact Details** | Text Area | Free text for contact information | No |

*Note: Multiple special relationships can be added per product owner*

### Client Management

| Field | Type | Options/Validation | Required |
|-------|------|-------------------|----------|
| **Type of Individual** | Dropdown | Ongoing, Transactional | Yes |
| **Lead Adviser** | Dropdown | Select from system advisers | Yes |
| **Client Start Date as Ongoing Client** | Date Field | DD/MM/YYYY with shortcuts | No |

## Meeting Schedule Item Type
**item_type:** `Meeting Schedule`  
**category:** `basic_detail`

*Note: This item type manages individual meeting schedules. Each meeting has expected month, booked status, and completion tracking.*

| Field | Type | Options/Validation | Required |
|-------|------|-------------------|----------|
| **Name** | Text Input | Instance identifier (e.g., "Q1 Annual Review", "Mid-Year Check-in") | Yes |
| **Meeting Type** | Dropdown | AR (Annual Review), Review, AD-HOC, CG | Yes |
| **Expected Month** | Dropdown | January, February, March, April, May, June, July, August, September, October, November, December | Yes |
| **Booked** | Dropdown | Yes, No | Yes |
| **Month Meeting Was Held** | Dropdown | January, February, March, April, May, June, July, August, September, October, November, December | No |
| **Notes** | Text Area | Free text notes | No |

**Logic**: 
- Each meeting tracks expected month, whether it's booked, and when it was actually held
- Aligns with existing Phase 2 meeting management system
- Multiple meeting schedule items can be created for different meeting types

## Client Declaration Item Type

| Field | Type | Options/Validation | Required |
|-------|------|-------------------|----------|
| **Date of Client Declaration** | Date Field | DD/MM/YYYY with shortcuts | Yes |
| **Notes** | Text Area | Free text notes | No |

## Privacy Declaration Item Type

| Field | Type | Options/Validation | Required |
|-------|------|-------------------|----------|
| **Date of Privacy Declaration** | Date Field | DD/MM/YYYY with shortcuts | Yes |
| **Notes** | Text Area | Free text notes | No |

## 3 Words & Share With Item Type

| Field | Type | Options/Validation | Required |
|-------|------|-------------------|----------|
| **3 Words & Share With** | Text Area | Free text | Yes |
| **Notes** | Text Area | Free text notes | No |

## Ongoing Fee Agreement Item Type

| Field | Type | Options/Validation | Required |
|-------|------|-------------------|----------|
| **Date of Ongoing Fee Agreement** | Date Field | DD/MM/YYYY with shortcuts | Yes |
| **Notes** | Text Area | Free text notes | No |

## AML Check Item Type

| Field | Type | Options/Validation | Required |
|-------|------|-------------------|----------|
| **AML Check** | Dropdown | Yes, No | Yes |
| **Notes** | Text Area | Free text notes | No |

## Driving Licence Item Type

| Field | Type | Options/Validation | Required |
|-------|------|-------------------|----------|
| **Driving Licence Expiry Date** | Date Field | DD/MM/YYYY with shortcuts | Yes |
| **Notes** | Text Area | Free text notes | No |

## Passport Item Type

| Field | Type | Options/Validation | Required |
|-------|------|-------------------|----------|
| **Passport Expiry Date** | Date Field | DD/MM/YYYY with shortcuts | Yes |
| **Notes** | Text Area | Free text notes | No |

## Other ID Item Type

| Field | Type | Options/Validation | Required |
|-------|------|-------------------|----------|
| **ID Description** | Text Area | Free text description | Yes |
| **Notes** | Text Area | Free text notes | No |

*Note: Multiple Other ID items can be added per client*

## Phone Number Item Type
**item_type:** `Phone Number`
**category:** `basic_detail`

| Field | Type | Options/Validation | Required |
|-------|------|-------------------|----------|
| **Name** | Text Input | Instance identifier (e.g., "Primary Mobile", "Work Phone", "Emergency Contact") | Yes |
| **Product Owners** | Multi-select Dropdown | Select multiple product owners | Yes |
| **Phone Type** | Dropdown + Custom | Mobile, Mobile (Work), Home, Work, Other (Free Type Box) | Yes |
| **Phone Number** | Phone Input | Standard phone validation | Yes |
| **Notes** | Text Area | Free text notes | No |

*Note: Multiple phone number items can be added per client. Different phone types use the same JSON structure.*

## Risk Questionnaire Item Type (Family Groups)
**item_type:** `Risk Questionnaire`  
**category:** `vulnerability_health`

*Note: Family groups require detailed risk assessment with full breakdown*

| Field | Type | Options/Validation | Required |
|-------|------|-------------------|----------|
| **Name** | Text Input | Instance identifier (e.g., "Initial Assessment", "Annual Review", "Updated Assessment") | Yes |
| **Date** | Date Field | DD/MM/YYYY with shortcuts | No |
| **Score** | Number Input | Numeric validation | No |
| **Group Description** | Dropdown + Custom | 1 - Very Minimal, 2 - Minimal, 3 - Modest, 4 - Medium, 5 - More Adventurous, 6 - Adventurous, 7 - Speculative, Customer Declined, Other (Free Type Box) | No |
| **Notes** | Text Area | Free text notes | No |

## Manual Risk Assessment Item Type (Family Groups)

*Note: Family groups require detailed manual risk assessment with reasoning*

| Field | Type | Options/Validation | Required |
|-------|------|-------------------|----------|
| **Date** | Date Field | DD/MM/YYYY with shortcuts | No |
| **Score** | Number Input | Numeric validation | No |
| **Group Description** | Dropdown + Custom | 1 - Very Minimal, 2 - Minimal, 3 - Modest, 4 - Medium, 5 - More Adventurous, 6 - Adventurous, 7 - Speculative, Other (Free Type Box) | No |
| **Reason** | Text Area | Free text explanation | No |
| **Notes** | Text Area | Free text notes | No |

## Capacity for Loss Item Type

*Note: Used by all client group types*

| Field | Type | Options/Validation | Required |
|-------|------|-------------------|----------|
| **Capacity for Loss** | Dropdown + Custom | Low, Low/Medium, Medium, Medium/High, High, Other (Free Type Box) | No |
| **Notes** | Text Area | Free text notes | No |

### Wills & Powers of Attorney

| Field | Type | Options/Validation | Required |
|-------|------|-------------------|----------|
| **Will Date** | Date Field | DD/MM/YYYY with shortcuts | No |
| **LPOA H&W Date** | Date Field | DD/MM/YYYY with shortcuts | No |
| **LPOA H&W Active** | Dropdown | Yes, No | No |
| **LPOA P&F Date** | Date Field | DD/MM/YYYY with shortcuts | No |
| **LPOA P&F Active** | Dropdown | Yes, No | No |
| **EPA Date** | Date Field | DD/MM/YYYY with shortcuts | No |
| **EPA Registered** | Dropdown | Yes, No | No |
| **Advanced Directive Date** | Date Field | DD/MM/YYYY with shortcuts | No |
| **Other** | Text Area | Free text description | No |
| **Other Date** | Date Field | DD/MM/YYYY with shortcuts | No |

---

## Basic Salary Item Type
**item_type:** `Basic Salary`
**category:** `income_expenditure`

| Field | Type | Options/Validation | Required |
|-------|------|-------------------|----------|
| **Name** | Text Input | Instance identifier (e.g., "Main Employment", "Part-time Job", "Consulting Income") | Yes |
| **Product Owners** | Multi-select Dropdown | Select multiple product owners | Yes |
| **Description** | Text Area | Free text description | No |
| **Amount** | Currency Input | 2 decimal places, no negative numbers | Yes |
| **Frequency** | Dropdown | Weekly, 4 Weekly, Monthly, Quarterly, 6 Monthly, Annually | Yes |
| **Date** | Date Field | DD/MM/YYYY with shortcuts | No |
| **Notes** | Text Area | Free text notes | No |

## Bonuses/Commissions Item Type

| Field | Type | Options/Validation | Required |
|-------|------|-------------------|----------|
| **Product Owners** | Multi-select Dropdown | Select multiple product owners | Yes |
| **Description** | Text Area | Free text description | No |
| **Amount** | Currency Input | 2 decimal places, no negative numbers | Yes |
| **Frequency** | Dropdown | Weekly, 4 Weekly, Monthly, Quarterly, 6 Monthly, Annually | Yes |
| **Date** | Date Field | DD/MM/YYYY with shortcuts | No |
| **Notes** | Text Area | Free text notes | No |

## Benefits in Kind Item Type

| Field | Type | Options/Validation | Required |
|-------|------|-------------------|----------|
| **Product Owners** | Multi-select Dropdown | Select multiple product owners | Yes |
| **Description** | Text Area | Free text description | No |
| **Amount** | Currency Input | 2 decimal places, no negative numbers | Yes |
| **Frequency** | Dropdown | Weekly, 4 Weekly, Monthly, Quarterly, 6 Monthly, Annually | Yes |
| **Date** | Date Field | DD/MM/YYYY with shortcuts | No |
| **Notes** | Text Area | Free text notes | No |

## State Pension Item Type

| Field | Type | Options/Validation | Required |
|-------|------|-------------------|----------|
| **Product Owners** | Multi-select Dropdown | Select multiple product owners | Yes |
| **Description** | Text Area | Free text description | No |
| **Amount** | Currency Input | 2 decimal places, no negative numbers | Yes |
| **Frequency** | Dropdown | Weekly, 4 Weekly, Monthly, Quarterly, 6 Monthly, Annually | Yes |
| **Date** | Date Field | DD/MM/YYYY with shortcuts | No |
| **Notes** | Text Area | Free text notes | No |

## Drawdown Income Item Type

| Field | Type | Options/Validation | Required |
|-------|------|-------------------|----------|
| **Product Owners** | Multi-select Dropdown | Select multiple product owners | Yes |
| **Description** | Text Area | Free text description | No |
| **Amount** | Currency Input | 2 decimal places, no negative numbers | Yes |
| **Frequency** | Dropdown | Weekly, 4 Weekly, Monthly, Quarterly, 6 Monthly, Annually | Yes |
| **Date** | Date Field | DD/MM/YYYY with shortcuts | No |
| **Notes** | Text Area | Free text notes | No |

## UFPLS Item Type

| Field | Type | Options/Validation | Required |
|-------|------|-------------------|----------|
| **Product Owners** | Multi-select Dropdown | Select multiple product owners | Yes |
| **Description** | Text Area | Free text description | No |
| **Amount** | Currency Input | 2 decimal places, no negative numbers | Yes |
| **Frequency** | Dropdown | Weekly, 4 Weekly, Monthly, Quarterly, 6 Monthly, Annually | Yes |
| **Date** | Date Field | DD/MM/YYYY with shortcuts | No |
| **Notes** | Text Area | Free text notes | No |

## Annuities Item Type

| Field | Type | Options/Validation | Required |
|-------|------|-------------------|----------|
| **Product Owners** | Multi-select Dropdown | Select multiple product owners | Yes |
| **Description** | Text Area | Free text description | No |
| **Amount** | Currency Input | 2 decimal places, no negative numbers | Yes |
| **Frequency** | Dropdown | Weekly, 4 Weekly, Monthly, Quarterly, 6 Monthly, Annually | Yes |
| **Date** | Date Field | DD/MM/YYYY with shortcuts | No |
| **Notes** | Text Area | Free text notes | No |

## State Benefit - Taxable Item Type

| Field | Type | Options/Validation | Required |
|-------|------|-------------------|----------|
| **Product Owners** | Multi-select Dropdown | Select multiple product owners | Yes |
| **Description** | Text Area | Free text description | No |
| **Amount** | Currency Input | 2 decimal places, no negative numbers | Yes |
| **Frequency** | Dropdown | Weekly, 4 Weekly, Monthly, Quarterly, 6 Monthly, Annually | Yes |
| **Date** | Date Field | DD/MM/YYYY with shortcuts | No |
| **Notes** | Text Area | Free text notes | No |

## State Benefit - Non-Taxable Item Type

| Field | Type | Options/Validation | Required |
|-------|------|-------------------|----------|
| **Product Owners** | Multi-select Dropdown | Select multiple product owners | Yes |
| **Description** | Text Area | Free text description | No |
| **Amount** | Currency Input | 2 decimal places, no negative numbers | Yes |
| **Frequency** | Dropdown | Weekly, 4 Weekly, Monthly, Quarterly, 6 Monthly, Annually | Yes |
| **Date** | Date Field | DD/MM/YYYY with shortcuts | No |
| **Notes** | Text Area | Free text notes | No |

## Rental Profit Item Type

| Field | Type | Options/Validation | Required |
|-------|------|-------------------|----------|
| **Product Owners** | Multi-select Dropdown | Select multiple product owners | Yes |
| **Description** | Text Area | Free text description | No |
| **Amount** | Currency Input | 2 decimal places, no negative numbers | Yes |
| **Frequency** | Dropdown | Weekly, 4 Weekly, Monthly, Quarterly, 6 Monthly, Annually | Yes |
| **Date** | Date Field | DD/MM/YYYY with shortcuts | No |
| **Notes** | Text Area | Free text notes | No |

## Interest Item Type

| Field | Type | Options/Validation | Required |
|-------|------|-------------------|----------|
| **Product Owners** | Multi-select Dropdown | Select multiple product owners | Yes |
| **Description** | Text Area | Free text description | No |
| **Amount** | Currency Input | 2 decimal places, no negative numbers | Yes |
| **Frequency** | Dropdown | Weekly, 4 Weekly, Monthly, Quarterly, 6 Monthly, Annually | Yes |
| **Date** | Date Field | DD/MM/YYYY with shortcuts | No |
| **Notes** | Text Area | Free text notes | No |

## Dividends Item Type

| Field | Type | Options/Validation | Required |
|-------|------|-------------------|----------|
| **Product Owners** | Multi-select Dropdown | Select multiple product owners | Yes |
| **Description** | Text Area | Free text description | No |
| **Amount** | Currency Input | 2 decimal places, no negative numbers | Yes |
| **Frequency** | Dropdown | Weekly, 4 Weekly, Monthly, Quarterly, 6 Monthly, Annually | Yes |
| **Date** | Date Field | DD/MM/YYYY with shortcuts | No |
| **Notes** | Text Area | Free text notes | No |

## Non-Taxable Income Item Type

| Field | Type | Options/Validation | Required |
|-------|------|-------------------|----------|
| **Product Owners** | Multi-select Dropdown | Select multiple product owners | Yes |
| **Description** | Text Area | Free text description | No |
| **Amount** | Currency Input | 2 decimal places, no negative numbers | Yes |
| **Frequency** | Dropdown | Weekly, 4 Weekly, Monthly, Quarterly, 6 Monthly, Annually | Yes |
| **Date** | Date Field | DD/MM/YYYY with shortcuts | No |
| **Notes** | Text Area | Free text notes | No |

## Chargeable Event Item Type

| Field | Type | Options/Validation | Required |
|-------|------|-------------------|----------|
| **Product Owners** | Multi-select Dropdown | Select multiple product owners | Yes |
| **Description** | Text Area | Free text description | No |
| **Amount** | Currency Input | 2 decimal places, no negative numbers | Yes |
| **Frequency** | Dropdown | Weekly, 4 Weekly, Monthly, Quarterly, 6 Monthly, Annually | Yes |
| **Date** | Date Field | DD/MM/YYYY with shortcuts | No |
| **Notes** | Text Area | Free text notes | No |

## Other Income Item Type

| Field | Type | Options/Validation | Required |
|-------|------|-------------------|----------|
| **Product Owners** | Multi-select Dropdown | Select multiple product owners | Yes |
| **Description** | Text Area | Free text description | No |
| **Amount** | Currency Input | 2 decimal places, no negative numbers | Yes |
| **Frequency** | Dropdown | Weekly, 4 Weekly, Monthly, Quarterly, 6 Monthly, Annually | Yes |
| **Date** | Date Field | DD/MM/YYYY with shortcuts | No |
| **Notes** | Text Area | Free text notes | No |

*Note: Total income will be calculated automatically from all income items. Multiple instances of each income type can be created per client.*

---

## Income Tax Item Type
**item_type:** `Income Tax`
**category:** `income_expenditure`

| Field | Type | Options/Validation | Required |
|-------|------|-------------------|----------|
| **Name** | Text Input | Instance identifier (e.g., "Annual Income Tax", "PAYE Deductions") | Yes |
| **Product Owners** | Multi-select Dropdown | Select multiple product owners | Yes |
| **Description** | Text Area | Free text description | No |
| **Amount** | Currency Input | 2 decimal places, no negative numbers | Yes |
| **Frequency** | Dropdown | Weekly, 4 Weekly, Monthly, Quarterly, 6 Monthly, Annually | Yes |
| **Date** | Date Field | DD/MM/YYYY with shortcuts | No |
| **Notes** | Text Area | Free text notes | No |

## Salary Sacrifice Item Type
**item_type:** `Salary Sacrifice`
**category:** `income_expenditure`

| Field | Type | Options/Validation | Required |
|-------|------|-------------------|----------|
| **Name** | Text Input | Instance identifier (e.g., "Pension Contributions", "Cycle to Work Scheme") | Yes |
| **Product Owners** | Multi-select Dropdown | Select multiple product owners | Yes |
| **Description** | Text Area | Free text description | No |
| **Amount** | Currency Input | 2 decimal places, no negative numbers | Yes |
| **Frequency** | Dropdown | Weekly, 4 Weekly, Monthly, Quarterly, 6 Monthly, Annually | Yes |
| **Date** | Date Field | DD/MM/YYYY with shortcuts | No |
| **Notes** | Text Area | Free text notes | No |

## Other Expenditure Items

*Note: Additional expenditure fields to be defined based on "Budget Form" requirements*

---

## Asset Items (Multiple Item Types)

*Note: Each asset type is a separate item. Clients can have multiple assets of the same type. Products can be managed (inherit from IRR system) or unmanaged (require manual valuation)*

### Cash Accounts
**item_type:** `Cash Accounts`  
**category:** `assets_liabilities`

| Field | Type | Options/Validation | Required |
|-------|------|-------------------|----------|
| **Name** | Text Input | Instance identifier (e.g., "Barclays Current Account", "Savings Account", "Joint Emergency Fund") | Yes |
| **Managed/Unmanaged** | Dropdown | Managed, Unmanaged | Yes |
| **Product Owners** | Multi-select + Relationships | Select multiple product owners with relationship type (Joint Tenants/Tenants in Common) and ownership percentages (must total 100%) | Yes |
| **Description** | Text Area | Free text description | Yes |
| **Current Value** | Currency Input | 2 decimal places, no negative numbers | Yes |
| **Value Date** | Date Field | DD/MM/YYYY with shortcuts | Yes |
| **Start Date** | Date Field | DD/MM/YYYY with shortcuts | Yes |
| **Maturity Date** | Date Field | DD/MM/YYYY with shortcuts | No |
| **Interest Rate** | Percentage Input | 0-100%, up to 2 decimal places | No |
| **Account Number** | Text Input | Standard text validation | No |
| **Notes** | Text Area | Free text notes | No |

### Premium Bonds
**item_type:** `Premium Bonds`  
**category:** `assets_liabilities`

| Field | Type | Options/Validation | Required |
|-------|------|-------------------|----------|
| **Name** | Text Input | Instance identifier (e.g., "Premium Bonds Account", "NS&I Premium Bonds") | Yes |
| **Product Owners** | Multi-select Dropdown | Select multiple product owners | Yes |
| **Bond Holder Number** | Text Input | Standard text validation | Yes |
| **Amount Held** | Currency Input | Numeric validation | Yes |
| **Start Date** | Date Field | DD/MM/YYYY with shortcuts | Yes |
| **Notes** | Text Area | Free text notes | No |

### Cash ISA
| Field | Type | Options/Validation | Required |
|-------|------|-------------------|----------|
| **Product Owners** | Multi-select Dropdown | Select multiple product owners | Yes |
| **Description** | Text Area | Free text description | Yes |
| **Current Value** | Currency Input | Numeric validation | Yes |
| **Value Date** | Date Field | DD/MM/YYYY with shortcuts | Yes |
| **Maturity Date** | Date Field | DD/MM/YYYY with shortcuts | No |
| **Interest Rate** | Percentage Input | Numeric validation | No |
| **Account Number** | Text Input | Standard text validation | No |
| **Notes** | Text Area | Free text notes | No |

### Stocks and Shares ISA (Unmanaged)
| Field | Type | Options/Validation | Required |
|-------|------|-------------------|----------|
| **Product Owners** | Multi-select Dropdown | Select multiple product owners | Yes |
| **Provider** | Text Input | Standard text validation | Yes |
| **Current Value** | Currency Input | Numeric validation | Yes |
| **Value Date** | Date Field | DD/MM/YYYY with shortcuts | Yes |
| **Plan Number** | Text Input | Standard text validation | No |
| **Notes** | Text Area | Free text notes | No |

### General Investment Account (Unmanaged)
| Field | Type | Options/Validation | Required |
|-------|------|-------------------|----------|
| **Product Owners** | Multi-select Dropdown | Select multiple product owners | Yes |
| **Provider** | Text Input | Standard text validation | Yes |
| **Current Value** | Currency Input | Numeric validation | Yes |
| **Value Date** | Date Field | DD/MM/YYYY with shortcuts | Yes |
| **Plan Number** | Text Input | Standard text validation | No |
| **Notes** | Text Area | Free text notes | No |

### Onshore Investment Bond (Unmanaged)
| Field | Type | Options/Validation | Required |
|-------|------|-------------------|----------|
| **Product Owners** | Multi-select Dropdown | Select multiple product owners | Yes |
| **Provider** | Text Input | Standard text validation | Yes |
| **Current Value** | Currency Input | Numeric validation | Yes |
| **Value Date** | Date Field | DD/MM/YYYY with shortcuts | Yes |
| **Plan Number** | Text Input | Standard text validation | No |
| **Notes** | Text Area | Free text notes | No |

### Offshore Investment Bond (Unmanaged)
| Field | Type | Options/Validation | Required |
|-------|------|-------------------|----------|
| **Product Owners** | Multi-select Dropdown | Select multiple product owners | Yes |
| **Provider** | Text Input | Standard text validation | Yes |
| **Current Value** | Currency Input | Numeric validation | Yes |
| **Value Date** | Date Field | DD/MM/YYYY with shortcuts | Yes |
| **Plan Number** | Text Input | Standard text validation | No |
| **Notes** | Text Area | Free text notes | No |

### Individual Shares
| Field | Type | Options/Validation | Required |
|-------|------|-------------------|----------|
| **Product Owners** | Multi-select Dropdown | Select multiple product owners | Yes |
| **Company** | Text Input | Standard text validation | Yes |
| **Number of Shares** | Number Input | Numeric validation | Yes |
| **Current Value** | Currency Input | Numeric validation | Yes |
| **Value Date** | Date Field | DD/MM/YYYY with shortcuts | Yes |
| **Notes** | Text Area | Free text notes | No |

### Personal Pensions (Unmanaged Only)
**item_type:** `Personal Pensions (Unmanaged)`  
**category:** `assets_liabilities`

*Note: Managed pensions are handled through the existing product management system*

| Field | Type | Options/Validation | Required |
|-------|------|-------------------|----------|
| **Name** | Text Input | Instance identifier (e.g., "SIPP with Provider X", "Old Company Pension") | Yes |
| **Product Owners** | Multi-select Dropdown | Select multiple product owners | Yes |
| **Plan Number** | Text Input | Standard text validation | Yes |
| **Provider** | Text Input | Standard text validation | Yes |
| **Current Value** | Currency Input | Numeric validation | Yes |
| **Value Date** | Date Field | DD/MM/YYYY with shortcuts | Yes |
| **Start Date** | Date Field | DD/MM/YYYY with shortcuts | Yes |
| **Notes** | Text Area | Free text notes | No |

### Workplace Pensions (Unmanaged Only)
**item_type:** `Workplace Pensions (Unmanaged)`  
**category:** `assets_liabilities`

*Note: Managed workplace pensions are handled through the existing product management system*

| Field | Type | Options/Validation | Required |
|-------|------|-------------------|----------|
| **Name** | Text Input | Instance identifier (e.g., "Current Employer Scheme", "Previous Job Pension") | Yes |
| **Product Owners** | Multi-select Dropdown | Select multiple product owners | Yes |
| **Plan Number** | Text Input | Standard text validation | Yes |
| **Provider** | Text Input | Standard text validation | Yes |
| **Current Value** | Currency Input | Numeric validation | Yes |
| **Value Date** | Date Field | DD/MM/YYYY with shortcuts | Yes |
| **Notes** | Text Area | Free text notes | No |

### Defined Benefit Pensions
| Field | Type | Options/Validation | Required |
|-------|------|-------------------|----------|
| **Product Owners** | Multi-select Dropdown | Select multiple product owners | Yes |
| **Employer** | Text Input | Standard text validation | Yes |
| **Current Pension Administrator** | Text Input | Standard text validation | Yes |
| **Reference Number** | Text Input | Standard text validation | Yes |
| **Last Forecast Amount Per Annum** | Currency Input | Numeric validation | No |
| **Date of Last Forecast** | Date Field | DD/MM/YYYY with shortcuts | No |
| **Current Contributions Amount** | Currency Input | Numeric validation | No |
| **Current Contributions Frequency** | Dropdown | Weekly, Monthly, Quarterly, Annually | No |
| **Current Contributions Type** | Text Input | Standard text validation | No |
| **Notes** | Text Area | Free text notes | No |

### EIS/VCT/ITS
| Field | Type | Options/Validation | Required |
|-------|------|-------------------|----------|
| **Product Owners** | Multi-select Dropdown | Select multiple product owners | Yes |
| **Type** | Dropdown | EIS, VCT, ITS | Yes |
| **Provider** | Text Input | Standard text validation | Yes |
| **Current Value** | Currency Input | Numeric validation | Yes |
| **Value Date** | Date Field | DD/MM/YYYY with shortcuts | Yes |
| **Notes** | Text Area | Free text notes | No |

### Whole of Life Plans with Surrender Value
| Field | Type | Options/Validation | Required |
|-------|------|-------------------|----------|
| **Product Owners** | Multi-select Dropdown | Select multiple product owners | Yes |
| **Provider** | Text Input | Standard text validation | Yes |
| **Plan Number** | Text Input | Standard text validation | Yes |
| **Surrender Value** | Currency Input | Numeric validation | Yes |
| **Value Date** | Date Field | DD/MM/YYYY with shortcuts | Yes |
| **Sum Assured** | Currency Input | Numeric validation | Yes |
| **Lives Assured** | Text Area | Free text description | Yes |
| **Notes** | Text Area | Free text notes | No |

### Land and Property
| Field | Type | Options/Validation | Required |
|-------|------|-------------------|----------|
| **Product Owners** | Multi-select Dropdown | Select multiple product owners | Yes |
| **Type of Ownership** | Dropdown | Single, Tenants in Common, Joint Tenants | Yes |
| **Ownership Percentage Split** | Text Input | Required if Tenants in Common | Conditional |
| **Type of Property** | Text Input | Standard text validation | Yes |
| **Address** | Address Block | Multi-line address | Yes |
| **Purchase Price** | Currency Input | Numeric validation | No |
| **Date Purchased** | Date Field | DD/MM/YYYY with shortcuts | No |
| **Current Value** | Currency Input | Numeric validation | Yes |
| **Value Date** | Date Field | DD/MM/YYYY with shortcuts | Yes |
| **Notes** | Text Area | Free text notes | No |

### Other Assets
| Field | Type | Options/Validation | Required |
|-------|------|-------------------|----------|
| **Product Owners** | Multi-select Dropdown | Select multiple product owners | Yes |
| **Description** | Text Area | Free text description (debts owed, personal possessions, cars, etc.) | Yes |
| **Value** | Currency Input | Numeric validation | Yes |
| **Value Date** | Date Field | DD/MM/YYYY with shortcuts | Yes |
| **Notes** | Text Area | Free text notes | No |

---

## Liability Items (Multiple Item Types)

### Mortgage
| Field | Type | Options/Validation | Required |
|-------|------|-------------------|----------|
| **Product Owners** | Multi-select Dropdown | Select multiple product owners | Yes |
| **Description** | Text Area | Free text description | Yes |
| **Mortgage Type** | Dropdown | Residential, BTL, Consumer BTL, Commercial, Lifetime Mortgage | Yes |
| **Term Outstanding** | Number Input | Numeric validation (months/years) | No |
| **Outstanding Amount** | Currency Input | Numeric validation | Yes |
| **Repayment Type** | Dropdown | Repayment, Interest Only, Part and Part | No |
| **Monthly Payment** | Currency Input | Numeric validation | No |
| **Interest Rate** | Percentage Input | Numeric validation | No |
| **End Date for Fixed Rate** | Date Field | DD/MM/YYYY with shortcuts | No |
| **ERC Details** | Text Area | Free text description | No |
| **Value of Property** | Currency Input | Numeric validation | No |
| **Property Address** | Address Block | Multi-line address | No |
| **Notes** | Text Area | Free text notes | No |

### Loans
| Field | Type | Options/Validation | Required |
|-------|------|-------------------|----------|
| **Product Owners** | Multi-select Dropdown | Select multiple product owners | Yes |
| **Lender** | Text Input | Standard text validation | Yes |
| **Balance Outstanding** | Currency Input | Numeric validation | Yes |
| **Balance Outstanding Date** | Date Field | DD/MM/YYYY with shortcuts | Yes |
| **Payment Frequency** | Dropdown | Weekly, Monthly, Quarterly, Annually | No |
| **Payment Amount** | Currency Input | Numeric validation | No |
| **Interest Rate** | Percentage Input | Numeric validation | No |
| **End Date** | Date Field | DD/MM/YYYY with shortcuts | No |
| **Notes** | Text Area | Free text notes | No |

### Car Finance
| Field | Type | Options/Validation | Required |
|-------|------|-------------------|----------|
| **Product Owners** | Multi-select Dropdown | Select multiple product owners | Yes |
| **Lender** | Text Input | Standard text validation | Yes |
| **Balance Outstanding** | Currency Input | Numeric validation | Yes |
| **Balance Outstanding Date** | Date Field | DD/MM/YYYY with shortcuts | Yes |
| **Payment Frequency** | Dropdown | Weekly, Monthly, Quarterly, Annually | No |
| **Payment Amount** | Currency Input | Numeric validation | No |
| **Interest Rate** | Percentage Input | Numeric validation | No |
| **End Date** | Date Field | DD/MM/YYYY with shortcuts | No |
| **Notes** | Text Area | Free text notes | No |

### Family Debts
| Field | Type | Options/Validation | Required |
|-------|------|-------------------|----------|
| **Product Owners** | Multi-select Dropdown | Select multiple product owners | Yes |
| **Lender** | Text Input | Standard text validation | Yes |
| **Balance Outstanding** | Currency Input | Numeric validation | Yes |
| **Balance Outstanding Date** | Date Field | DD/MM/YYYY with shortcuts | Yes |
| **Payment Frequency** | Dropdown | Weekly, Monthly, Quarterly, Annually | No |
| **Payment Amount** | Currency Input | Numeric validation | No |
| **Interest Rate** | Percentage Input | Numeric validation | No |
| **End Date** | Date Field | DD/MM/YYYY with shortcuts | No |
| **Notes** | Text Area | Free text notes | No |

### Credit Cards
| Field | Type | Options/Validation | Required |
|-------|------|-------------------|----------|
| **Product Owners** | Multi-select Dropdown | Select multiple product owners | Yes |
| **Lender** | Text Input | Standard text validation | Yes |
| **Balance Outstanding** | Currency Input | Numeric validation | Yes |
| **Balance Outstanding Date** | Date Field | DD/MM/YYYY with shortcuts | Yes |
| **Payment Frequency** | Dropdown | Weekly, Monthly, Quarterly, Annually | No |
| **Payment Amount** | Currency Input | Numeric validation | No |
| **Interest Rate** | Percentage Input | Numeric validation | No |
| **End Date** | Date Field | DD/MM/YYYY with shortcuts | No |
| **Notes** | Text Area | Free text notes | No |

### Student Loans
| Field | Type | Options/Validation | Required |
|-------|------|-------------------|----------|
| **Product Owners** | Multi-select Dropdown | Select multiple product owners | Yes |
| **Scheme** | Text Input | Standard text validation | Yes |
| **Balance Outstanding** | Currency Input | Numeric validation | Yes |
| **Balance Outstanding Date** | Date Field | DD/MM/YYYY with shortcuts | Yes |
| **Notes** | Text Area | Free text notes | No |

### Tax Debt
| Field | Type | Options/Validation | Required |
|-------|------|-------------------|----------|
| **Product Owners** | Multi-select Dropdown | Select multiple product owners | Yes |
| **Amount** | Currency Input | Numeric validation | Yes |
| **Amount Due Date** | Date Field | DD/MM/YYYY with shortcuts | Yes |
| **Type of Tax** | Text Input | Standard text validation | Yes |
| **Notes** | Text Area | Free text notes | No |

---

## Protection Items

*Note: Multiple policies can be created per client group*

### Protection Policy
**item_type:** `Protection Policy`  
**category:** `protection`

| Field | Type | Options/Validation | Required |
|-------|------|-------------------|----------|
| **Name** | Text Input | Instance identifier (e.g., "Life Insurance Policy", "Critical Illness Cover", "Income Protection") | Yes |
| **Product Owners** | Multi-select Dropdown | Select multiple product owners | Yes |
| **Provider** | Text Input | Standard text validation | Yes |
| **Policy Number** | Text Input | Standard text validation | Yes |
| **Cover Type** | Dropdown | Life, Life & CI, CI, Income Protection, Accident and Sickness, Private Medical, Relevant Life – Life, Relevant Life CI, Relevant Life – Life & CI, Key Person Life, Key Person CI, Key Person Life & CI | Yes |
| **Term Type** | Dropdown | Level Term, Increasing Term, Decreasing Term, Family Income Benefit, WoL First Death, WoL Second Death | Yes |
| **Lives Assured** | Text Area | Free text description | Yes |
| **Sum Assured by Cover Type** | Currency Input | Numeric validation | Yes |
| **Duration** | Number Input | Numeric validation (years) | No |
| **Start Date** | Date Field | DD/MM/YYYY with shortcuts | Yes |
| **Monthly Payment** | Currency Input | Numeric validation | No |
| **End Date** | Date Field | DD/MM/YYYY with shortcuts | No |
| **Investment Element** | Dropdown | Yes, No | No |
| **Surrender Value** | Currency Input | Required if Investment Element = Yes | Conditional |
| **Date of Value** | Date Field | Required if Investment Element = Yes | Conditional |
| **In Trust** | Dropdown | Yes, No | No |
| **Notes** | Text Area | Free text notes | No |

---

# BUSINESS CLIENT GROUP TYPE

*Note: Business groups use the same individual item types as Family groups, plus the additional business-specific item types below.*

## Business Name Item Type

| Field | Type | Options/Validation | Required |
|-------|------|-------------------|----------|
| **Name of Business** | Text Input | Standard text validation | Yes |
| **Notes** | Text Area | Free text notes | No |

## Companies House Registration Item Type

| Field | Type | Options/Validation | Required |
|-------|------|-------------------|----------|
| **Companies House Registration Number** | Text Input | Standard text validation | Yes |
| **Notes** | Text Area | Free text notes | No |

## Company Address Item Type

| Field | Type | Options/Validation | Required |
|-------|------|-------------------|----------|
| **Company Address** | Address Block | Multi-line address | Yes |
| **Notes** | Text Area | Free text notes | No |

## Business Inception Item Type

| Field | Type | Options/Validation | Required |
|-------|------|-------------------|----------|
| **Inception Date** | Date Field | DD/MM/YYYY with shortcuts | Yes |
| **Notes** | Text Area | Free text notes | No |

## Business Type Item Type

| Field | Type | Options/Validation | Required |
|-------|------|-------------------|----------|
| **Business Type** | Text Area | Free text description | Yes |
| **Notes** | Text Area | Free text notes | No |

## Business Valuation Item Type

| Field | Type | Options/Validation | Required |
|-------|------|-------------------|----------|
| **Business Value** | Currency Input | Numeric validation | Yes |
| **Business Value Date** | Date Field | DD/MM/YYYY with shortcuts | Yes |
| **Notes** | Text Area | Free text notes | No |

## Director Details Item Type

*Note: Multiple director items can be added per business*

| Field | Type | Options/Validation | Required |
|-------|------|-------------------|----------|
| **Title** | Dropdown + Custom | Mr, Mrs, Miss, Other (Free Type Box) | No |
| **Forenames** | Text Input | Standard text validation | Yes |
| **Surname** | Text Input | Standard text validation | Yes |
| **Known As** | Text Input | Standard text validation | No |
| **Gender** | Dropdown + Custom | Male, Female, Other (Free Type Box) | No |
| **Vulnerable** | Dropdown + Notes | Yes (Free Type Box), No | No |
| **Vulnerability Adjustments Required** | Dropdown + Notes | Yes (Free Type Box), No | No |
| **Notes** | Text Area | Free text notes | No |

## Shareholder Details Item Type

*Note: Multiple shareholder items can be added per business*

| Field | Type | Options/Validation | Required |
|-------|------|-------------------|----------|
| **Shareholder Name** | Text Input | Standard text validation | Yes |
| **Type of Shareholding** | Text Input | Standard text validation | No |
| **Amount of Shares** | Number Input | Numeric validation | No |
| **Notes** | Text Area | Free text notes | No |

## Lead Adviser Item Type

| Field | Type | Options/Validation | Required |
|-------|------|-------------------|----------|
| **Lead Adviser** | Dropdown | Select from system advisers | Yes |
| **Notes** | Text Area | Free text notes | No |

## Client Start Date Item Type

| Field | Type | Options/Validation | Required |
|-------|------|-------------------|----------|
| **Client Start Date as Ongoing Client** | Date Field | DD/MM/YYYY with shortcuts | Yes |
| **Notes** | Text Area | Free text notes | No |

## Meeting Schedule Per Year Item Type

| Field | Type | Options/Validation | Required |
|-------|------|-------------------|----------|
| **Number of Meetings per Year** | Number Input | Numeric validation | Yes |
| **Months of Meetings** | Text Input | Standard text validation | No |
| **Notes** | Text Area | Free text notes | No |

## Company ID Item Type

| Field | Type | Options/Validation | Required |
|-------|------|-------------------|----------|
| **Company ID** | Text Input | Standard text validation | Yes |
| **Date of Company ID** | Date Field | DD/MM/YYYY with shortcuts | Yes |
| **Notes** | Text Area | Free text notes | No |

### Risk Assessment

#### Risk Questionnaire
| Field | Type | Options/Validation | Required |
|-------|------|-------------------|----------|
| **Date** | Date Field | DD/MM/YYYY with shortcuts | No |
| **Score** | Number Input | Numeric validation | No |
| **Group Description** | Dropdown | 1 - Very Minimal, 2 - Minimal, 3 - Modest, 4 - Medium, 5 - More Adventurous, 6 - Adventurous, 7 - Speculative, Customer Declined | No |

#### Manual Risk Assessment
| Field | Type | Options/Validation | Required |
|-------|------|-------------------|----------|
| **Date** | Date Field | DD/MM/YYYY with shortcuts | No |
| **Score** | Number Input | Numeric validation | No |
| **Group Description** | Dropdown | 1 - Very Minimal, 2 - Minimal, 3 - Modest, 4 - Medium, 5 - More Adventurous, 6 - Adventurous, 7 - Speculative | No |
| **Reason** | Text Area | Free text explanation | No |

#### Capacity for Loss
| Field | Type | Options/Validation | Required |
|-------|------|-------------------|----------|
| **Capacity for Loss** | Dropdown | Low, Low/Medium, Medium, Medium/High, High | No |

*Note: Business groups can have all the same Income, Asset, Liability, and Protection items as Family groups*

---

# TRUST CLIENT GROUP TYPE

*Note: Trust groups use the same individual item types as Family groups, plus the additional trust-specific item types below.*

## Trust Name Item Type

| Field | Type | Options/Validation | Required |
|-------|------|-------------------|----------|
| **Name of Trust** | Text Input | Standard text validation | Yes |
| **Notes** | Text Area | Free text notes | No |

## Trust Type Item Type

| Field | Type | Options/Validation | Required |
|-------|------|-------------------|----------|
| **Type of Trust** | Text Input | Standard text validation | Yes |
| **Notes** | Text Area | Free text notes | No |

## Trust Registration Item Type

| Field | Type | Options/Validation | Required |
|-------|------|-------------------|----------|
| **Trust Registration Service Registration Number** | Text Input | Standard text validation | Yes |
| **Notes** | Text Area | Free text notes | No |

## Settlor Details Item Type

| Field | Type | Options/Validation | Required |
|-------|------|-------------------|----------|
| **Settlor Details** | Text Area | Free text description | Yes |
| **Notes** | Text Area | Free text notes | No |

## Beneficiary Details Item Type

| Field | Type | Options/Validation | Required |
|-------|------|-------------------|----------|
| **Beneficiary Details** | Text Area | Free text description | Yes |
| **Notes** | Text Area | Free text notes | No |

## Lead Trustee Address Item Type

| Field | Type | Options/Validation | Required |
|-------|------|-------------------|----------|
| **Lead Trustee Address** | Address Block | Multi-line address | Yes |
| **Notes** | Text Area | Free text notes | No |

## Trust Start Date Item Type

| Field | Type | Options/Validation | Required |
|-------|------|-------------------|----------|
| **Trust Start Date** | Date Field | DD/MM/YYYY with shortcuts | Yes |
| **Notes** | Text Area | Free text notes | No |

## Trustee Details Item Type

*Note: Multiple trustee items can be added per trust*

| Field | Type | Options/Validation | Required |
|-------|------|-------------------|----------|
| **Trustee Name** | Text Area | Free text description (select from product owners in future) | Yes |
| **Contact Details** | Text Area | Free text contact information | No |
| **Notes** | Text Area | Free text notes | No |

### Risk Assessment

#### Risk Questionnaire
| Field | Type | Options/Validation | Required |
|-------|------|-------------------|----------|
| **Date** | Date Field | DD/MM/YYYY with shortcuts | No |
| **Score** | Number Input | Numeric validation | No |
| **Group Description** | Dropdown | 1 - Very Minimal, 2 - Minimal, 3 - Modest, 4 - Medium, 5 - More Adventurous, 6 - Adventurous, 7 - Speculative, Customer Declined | No |

#### Manual Risk Assessment
| Field | Type | Options/Validation | Required |
|-------|------|-------------------|----------|
| **Date** | Date Field | DD/MM/YYYY with shortcuts | No |
| **Score** | Number Input | Numeric validation | No |
| **Group Description** | Dropdown | 1 - Very Minimal, 2 - Minimal, 3 - Modest, 4 - Medium, 5 - More Adventurous, 6 - Adventurous, 7 - Speculative | No |
| **Reason** | Text Area | Free text explanation | No |

#### Capacity for Loss
| Field | Type | Options/Validation | Required |
|-------|------|-------------------|----------|
| **Capacity for Loss** | Dropdown | Low, Low/Medium, Medium, Medium/High, High | No |

*Note: Trust groups can have all the same Income, Asset, Liability, and Protection items as Family groups*

---

## Technical Implementation Notes

### Database Considerations
1. **JSON Storage**: Item types will be stored as JSON objects as decided in Phase 2 documentation, providing flexibility for different item type structures
2. **Product Owner Relationships**: Many-to-many relationships between items and product owners
3. **Client Group Associations**: All items belong to a specific client group
4. **Managed vs Unmanaged Products**: Unmanaged products require manual valuation fields, managed products inherit from existing IRR system

### UI/UX Considerations
1. **Date Shortcuts**: Implement T+/T-/T shortcuts in date inputs with typing validation
2. **Dropdown Extensions**: All dropdowns include "Other" option with auto-add functionality for expanding option lists
3. **Notes Fields**: Consistent text area styling across all items
4. **Multi-select Product Owners**: Consistent interface for selecting multiple owners
5. **Item Lists**: Ability to add multiple instances of the same item type per client
6. **Form Validation**: Client-side and server-side validation for all fields

### Integration Points with Existing Phase 2 Architecture

#### Database Integration
**Client Information Items Table**: All item types store data in the existing `client_information_items` table with the following structure:
```sql
client_information_items (
  id SERIAL PRIMARY KEY,
  client_group_id INTEGER REFERENCES client_groups(id),
  item_type VARCHAR(100) NOT NULL, -- Specific item name (e.g., "Phone Number", "Address", "Basic Salary")
  category VARCHAR(50) NOT NULL CHECK (
    category IN ('basic_detail', 'income_expenditure', 'assets_liabilities', 'protection', 'vulnerability_health')
  ), -- Big 5 category
  name VARCHAR(255), -- Instance identifier
  data_content JSON NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  created_by INTEGER REFERENCES users(id),
  updated_by INTEGER REFERENCES users(id)
);
```

**Product Owner Associations**: Item-to-product-owner relationships stored in `client_item_product_owners` table:
```sql
client_item_product_owners (
  id SERIAL PRIMARY KEY,
  client_information_item_id INTEGER REFERENCES client_information_items(id),
  product_owner_id INTEGER REFERENCES product_owners(id),
  ownership_percentage DECIMAL(5,2),
  association_type VARCHAR(50) -- 'joint_tenants' or 'tenants_in_common'
);
```

#### Frontend Component Integration
**3-Section Layout**: Item types integrate with existing Phase 2 component architecture:
- **PersonalSection**: Basic details, contact information, health/vulnerability items
- **ContactSection**: Phone numbers, email addresses, address information
- **ComplianceSection**: Full-width items like declarations, risk assessments, compliance documents

**Dense Table Integration**: All item types display in `DenseDataTable` components with:
- Virtual scrolling for large item lists
- Inline editing capabilities via `EditableTableRow`
- Bulk operations through `GlobalActionsTable`
- Information-dense 32-40px row heights

#### API Endpoint Integration
**Existing Endpoints Enhanced**:
- `GET/POST /api/client_groups/{id}/information_items` - List/create items by category
- `PUT/DELETE /api/information_items/{id}` - Update/delete individual items
- `POST /api/bulk_client_data` - Enhanced with new item types
- `GET /api/client_groups/{id}/summary` - Includes new Big 5 category aggregation

**New Endpoints Required**:
- `GET /api/item_types/templates` - Return item type JSON schemas
- `POST /api/item_types/validate` - Server-side validation endpoint
- `GET /api/item_types/categories` - Big 5 category definitions

#### Security Integration
**Field-Level Encryption**: Integrates with existing `FieldEncryptionService`:
```typescript
// Automatic encryption/decryption for sensitive fields
const encryptedData = await FieldEncryptionService.encryptSensitiveFields(
  itemTypeData, 
  ITEM_TYPE_ENCRYPTION_CONFIG[itemType]
);
```

**Audit Logging**: Enhanced `AuditLoggingService` captures all item type changes:
```typescript
await AuditLoggingService.logItemTypeChange({
  clientGroupId,
  itemType,
  category,
  changeType: 'create',
  sensitiveFields: encryptedFields,
  businessJustification
});
```

#### Performance Optimizations
**Virtual Scrolling**: Item type lists leverage existing `VirtualScrollService` for lists over 200+ items
**Caching Strategy**: Item type data cached using existing React Query patterns with 5-minute TTL
**Bulk Loading**: `OptimizedDataLoader` enhanced to handle new item type structures

#### Report Integration
**Global Actions Export**: All item types included in existing report export functionality
**IRR Integration**: Managed asset item types automatically sync with portfolio valuation system
**Print Service**: Item type data formatted for existing PDF generation via `ReportFormatter`

#### User Experience Integration
**Smart Navigation**: `useSmartNavigation` enhanced with item type breadcrumbs
**Auto-Save**: `AutoSaveIndicator` works with all item type forms
**Presence Detection**: `PresenceIndicator` shows concurrent users editing same items
**Search Integration**: All item types searchable via existing global search with category filtering

#### Migration Considerations
**Data Migration**: Existing client data maps to new item types via migration scripts
**Backward Compatibility**: Existing client data API endpoints remain functional during transition
**Phased Rollout**: Item types introduced incrementally by Big 5 category
**Training Integration**: Item type workflows integrate with existing user training documentation

#### Development Workflow Integration
**Component Library**: New item type components follow existing Phase 2 design system
**Testing Patterns**: Item types tested using existing TDD patterns with enhanced security validation
**Documentation**: Item types documented in existing `docs/10_reference/` structure

### Assets & Liabilities Card Data Mapping

**Card Display Format** (Phase 2.1 Pilot Only):
```
[Product Name] ........................ [Value] [Start Date] [>]
```

**Data Mapping by Item Type:**
```javascript
const getCardData = (item) => {
  const data = item.data_content;
  
  return {
    productName: item.name || item.item_type,
    value: data.current_value || data.amount_held || data.sum_assured,
    startDate: data.start_date, // Required for all A&L items
    isManaged: data.managed_unmanaged === 'Managed',
    expandedContent: data
  };
};
```

**Value Field Mapping:**
- **Cash Accounts, ISAs, Investments**: `current_value`
- **Premium Bonds**: `amount_held`  
- **Protection Policies**: `sum_assured`
- **Pensions**: `current_value`
- **Liabilities**: `outstanding_amount` or `balance_outstanding`

**Phase 2.2+ Planning**: Other categories will use traditional table displays with last_modified timestamps until user feedback determines optimal approaches.

This comprehensive integration ensures seamless adoption of new item types within the existing Kingston's Portal Phase 2 architecture while maintaining performance, security, and user experience standards.