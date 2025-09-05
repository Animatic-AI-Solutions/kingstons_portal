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
- **Components**: 5 address lines for street, area, town, county, etc. + Postcode field
- **Validation**: Postcode format validation
- **Lines**: Each line is a text input field
- **Required**: Address lines are flexible, postcode typically required

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

# FAMILY CLIENT GROUP TYPE

## Basic Details - Product Owner Details

### Personal Information

| Field | Type | Options/Validation | Required |
|-------|------|-------------------|----------|
| **Title** | Dropdown + Custom | Mr, Mrs, Miss, Dr, Other (Free Type Box) | Yes |
| **Forename** | Text Input | Standard text validation | Yes |
| **Middle Names** | Text Input | Standard text validation (multiple names in one string) | No |
| **Surname** | Text Input | Standard text validation | Yes |
| **Known As** | Text Input | Standard text validation | No |
| **Date of Birth** | Date Field | DD/MM/YYYY with shortcuts | Yes |
| **Previous Name(s)** | Text Area | Multiple names allowed | No |

### Contact Information

| Field | Type | Options/Validation | Required |
|-------|------|-------------------|----------|
| **Main Residence** | Address Block | 5 address lines + Postcode | Yes |
| **Email Address** | Email Input | Email validation | No |

*Note: Phone numbers are managed as separate Phone Number item types*

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

### Health & Vulnerability

| Field | Type | Options/Validation | Required |
|-------|------|-------------------|----------|
| **Vulnerable** | Dropdown | Yes, No | No |
| **Vulnerable Details** | Text Area | Free text description (appears when Vulnerable = Yes) | Conditional |
| **Vulnerability Adjustments Required** | Dropdown | Yes, No | No |
| **Vulnerability Adjustments Details** | Text Area | Free text description (appears when Vulnerability Adjustments Required = Yes) | Conditional |
| **Health Issues** | Dropdown | Yes, No | No |
| **Health Issues Details** | Text Area | Free text description (appears when Health Issues = Yes) | Conditional |
| **Medication** | Dropdown | Yes, No, N/A | No |
| **Medication Details** | Text Area | Free text description (appears when Medication = Yes) | Conditional |
| **Smoker Status** | Dropdown | Smoker, Non-smoker, Previous Smoker, Vaping | No |
| **Smoker Status Details** | Text Area | Free text description for any smoker status | No |

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

*Note: This item type manages individual meeting schedules. Each meeting has separate expected, booked, and completion tracking.*

| Field | Type | Options/Validation | Required |
|-------|------|-------------------|----------|
| **Meeting Type** | Dropdown | AR (Annual Review), Review, AD-HOC, CG | Yes |
| **Expected Meeting Date** | Date Field | DD/MM/YYYY with shortcuts | No |
| **Booked Date** | Date Field | DD/MM/YYYY with shortcuts | No |
| **Actually Done Date** | Date Field | DD/MM/YYYY with shortcuts | No |
| **Notes** | Text Area | Free text notes | No |

**Logic**: 
- Each meeting has three separate date tracking fields
- Home page will prompt users to tick off meetings as done once past the booked date
- Once an actual completion date is entered, system prompts user to change the due date or make it empty ready for next year
- Multiple meeting schedule items can be created for the same type (e.g., multiple AR meetings per year)

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

| Field | Type | Options/Validation | Required |
|-------|------|-------------------|----------|
| **Phone Type** | Dropdown + Custom | Mobile, Mobile (Work), Home, Work, Other (Free Type Box) | Yes |
| **Phone Number** | Phone Input | Standard phone validation | Yes |
| **Notes** | Text Area | Free text notes | No |

*Note: Multiple phone number items can be added per client. Different phone types use the same JSON structure.*

## Risk Questionnaire Item Type (Family Groups)

*Note: Family groups require detailed risk assessment with full breakdown*

| Field | Type | Options/Validation | Required |
|-------|------|-------------------|----------|
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

| Field | Type | Options/Validation | Required |
|-------|------|-------------------|----------|
| **Description** | Text Area | Free text description | No |
| **Amount** | Currency Input | 2 decimal places, no negative numbers | Yes |
| **Frequency** | Dropdown | Weekly, 4 Weekly, Monthly, Quarterly, 6 Monthly, Annually | Yes |
| **Date** | Date Field | DD/MM/YYYY with shortcuts | No |
| **Notes** | Text Area | Free text notes | No |

## Bonuses/Commissions Item Type

| Field | Type | Options/Validation | Required |
|-------|------|-------------------|----------|
| **Description** | Text Area | Free text description | No |
| **Amount** | Currency Input | 2 decimal places, no negative numbers | Yes |
| **Frequency** | Dropdown | Weekly, 4 Weekly, Monthly, Quarterly, 6 Monthly, Annually | Yes |
| **Date** | Date Field | DD/MM/YYYY with shortcuts | No |
| **Notes** | Text Area | Free text notes | No |

## Benefits in Kind Item Type

| Field | Type | Options/Validation | Required |
|-------|------|-------------------|----------|
| **Description** | Text Area | Free text description | No |
| **Amount** | Currency Input | 2 decimal places, no negative numbers | Yes |
| **Frequency** | Dropdown | Weekly, 4 Weekly, Monthly, Quarterly, 6 Monthly, Annually | Yes |
| **Date** | Date Field | DD/MM/YYYY with shortcuts | No |
| **Notes** | Text Area | Free text notes | No |

## State Pension Item Type

| Field | Type | Options/Validation | Required |
|-------|------|-------------------|----------|
| **Description** | Text Area | Free text description | No |
| **Amount** | Currency Input | 2 decimal places, no negative numbers | Yes |
| **Frequency** | Dropdown | Weekly, 4 Weekly, Monthly, Quarterly, 6 Monthly, Annually | Yes |
| **Date** | Date Field | DD/MM/YYYY with shortcuts | No |
| **Notes** | Text Area | Free text notes | No |

## Drawdown Income Item Type

| Field | Type | Options/Validation | Required |
|-------|------|-------------------|----------|
| **Description** | Text Area | Free text description | No |
| **Amount** | Currency Input | 2 decimal places, no negative numbers | Yes |
| **Frequency** | Dropdown | Weekly, 4 Weekly, Monthly, Quarterly, 6 Monthly, Annually | Yes |
| **Date** | Date Field | DD/MM/YYYY with shortcuts | No |
| **Notes** | Text Area | Free text notes | No |

## UFPLS Item Type

| Field | Type | Options/Validation | Required |
|-------|------|-------------------|----------|
| **Description** | Text Area | Free text description | No |
| **Amount** | Currency Input | 2 decimal places, no negative numbers | Yes |
| **Frequency** | Dropdown | Weekly, 4 Weekly, Monthly, Quarterly, 6 Monthly, Annually | Yes |
| **Date** | Date Field | DD/MM/YYYY with shortcuts | No |
| **Notes** | Text Area | Free text notes | No |

## Annuities Item Type

| Field | Type | Options/Validation | Required |
|-------|------|-------------------|----------|
| **Description** | Text Area | Free text description | No |
| **Amount** | Currency Input | 2 decimal places, no negative numbers | Yes |
| **Frequency** | Dropdown | Weekly, 4 Weekly, Monthly, Quarterly, 6 Monthly, Annually | Yes |
| **Date** | Date Field | DD/MM/YYYY with shortcuts | No |
| **Notes** | Text Area | Free text notes | No |

## State Benefit - Taxable Item Type

| Field | Type | Options/Validation | Required |
|-------|------|-------------------|----------|
| **Description** | Text Area | Free text description | No |
| **Amount** | Currency Input | 2 decimal places, no negative numbers | Yes |
| **Frequency** | Dropdown | Weekly, 4 Weekly, Monthly, Quarterly, 6 Monthly, Annually | Yes |
| **Date** | Date Field | DD/MM/YYYY with shortcuts | No |
| **Notes** | Text Area | Free text notes | No |

## State Benefit - Non-Taxable Item Type

| Field | Type | Options/Validation | Required |
|-------|------|-------------------|----------|
| **Description** | Text Area | Free text description | No |
| **Amount** | Currency Input | 2 decimal places, no negative numbers | Yes |
| **Frequency** | Dropdown | Weekly, 4 Weekly, Monthly, Quarterly, 6 Monthly, Annually | Yes |
| **Date** | Date Field | DD/MM/YYYY with shortcuts | No |
| **Notes** | Text Area | Free text notes | No |

## Rental Profit Item Type

| Field | Type | Options/Validation | Required |
|-------|------|-------------------|----------|
| **Description** | Text Area | Free text description | No |
| **Amount** | Currency Input | 2 decimal places, no negative numbers | Yes |
| **Frequency** | Dropdown | Weekly, 4 Weekly, Monthly, Quarterly, 6 Monthly, Annually | Yes |
| **Date** | Date Field | DD/MM/YYYY with shortcuts | No |
| **Notes** | Text Area | Free text notes | No |

## Interest Item Type

| Field | Type | Options/Validation | Required |
|-------|------|-------------------|----------|
| **Description** | Text Area | Free text description | No |
| **Amount** | Currency Input | 2 decimal places, no negative numbers | Yes |
| **Frequency** | Dropdown | Weekly, 4 Weekly, Monthly, Quarterly, 6 Monthly, Annually | Yes |
| **Date** | Date Field | DD/MM/YYYY with shortcuts | No |
| **Notes** | Text Area | Free text notes | No |

## Dividends Item Type

| Field | Type | Options/Validation | Required |
|-------|------|-------------------|----------|
| **Description** | Text Area | Free text description | No |
| **Amount** | Currency Input | 2 decimal places, no negative numbers | Yes |
| **Frequency** | Dropdown | Weekly, 4 Weekly, Monthly, Quarterly, 6 Monthly, Annually | Yes |
| **Date** | Date Field | DD/MM/YYYY with shortcuts | No |
| **Notes** | Text Area | Free text notes | No |

## Non-Taxable Income Item Type

| Field | Type | Options/Validation | Required |
|-------|------|-------------------|----------|
| **Description** | Text Area | Free text description | No |
| **Amount** | Currency Input | 2 decimal places, no negative numbers | Yes |
| **Frequency** | Dropdown | Weekly, 4 Weekly, Monthly, Quarterly, 6 Monthly, Annually | Yes |
| **Date** | Date Field | DD/MM/YYYY with shortcuts | No |
| **Notes** | Text Area | Free text notes | No |

## Chargeable Event Item Type

| Field | Type | Options/Validation | Required |
|-------|------|-------------------|----------|
| **Description** | Text Area | Free text description | No |
| **Amount** | Currency Input | 2 decimal places, no negative numbers | Yes |
| **Frequency** | Dropdown | Weekly, 4 Weekly, Monthly, Quarterly, 6 Monthly, Annually | Yes |
| **Date** | Date Field | DD/MM/YYYY with shortcuts | No |
| **Notes** | Text Area | Free text notes | No |

## Other Income Item Type

| Field | Type | Options/Validation | Required |
|-------|------|-------------------|----------|
| **Description** | Text Area | Free text description | No |
| **Amount** | Currency Input | 2 decimal places, no negative numbers | Yes |
| **Frequency** | Dropdown | Weekly, 4 Weekly, Monthly, Quarterly, 6 Monthly, Annually | Yes |
| **Date** | Date Field | DD/MM/YYYY with shortcuts | No |
| **Notes** | Text Area | Free text notes | No |

*Note: Total income will be calculated automatically from all income items. Multiple instances of each income type can be created per client.*

---

## Expenditure Items

*Note: Expenditure section requires client clarification - currently undefined*

### Confirmed Fields
| Field | Type | Options/Validation | Required |
|-------|------|-------------------|----------|
| **Income Tax** | Currency Input | Numeric validation | No |
| **Salary Sacrifice Pension** | Currency Input | Numeric validation | No |

*Additional expenditure fields to be defined based on "Budget Form" requirements*

---

## Asset Items (Multiple Item Types)

*Note: Each asset type is a separate item. Clients can have multiple assets of the same type. Products can be managed (inherit from IRR system) or unmanaged (require manual valuation)*

### Cash Accounts
| Field | Type | Options/Validation | Required |
|-------|------|-------------------|----------|
| **Managed/Unmanaged** | Dropdown | Managed, Unmanaged | Yes |
| **Product Owners** | Multi-select + Relationships | Select multiple product owners with relationship type (Joint Tenants/Tenants in Common) and ownership percentages (must total 100%) | Yes |
| **Description** | Text Area | Free text description | Yes |
| **Current Value** | Currency Input | 2 decimal places, no negative numbers | Yes |
| **Value Date** | Date Field | DD/MM/YYYY with shortcuts | Yes |
| **Maturity Date** | Date Field | DD/MM/YYYY with shortcuts | No |
| **Interest Rate** | Percentage Input | 0-100%, up to 2 decimal places | No |
| **Account Number** | Text Input | Standard text validation | No |
| **Notes** | Text Area | Free text notes | No |

### Premium Bonds
| Field | Type | Options/Validation | Required |
|-------|------|-------------------|----------|
| **Product Owners** | Multi-select Dropdown | Select multiple product owners | Yes |
| **Bond Holder Number** | Text Input | Standard text validation | Yes |
| **Amount Held** | Currency Input | Numeric validation | Yes |
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

### Personal Pensions (Unmanaged)
| Field | Type | Options/Validation | Required |
|-------|------|-------------------|----------|
| **Product Owners** | Multi-select Dropdown | Select multiple product owners | Yes |
| **Plan Number** | Text Input | Standard text validation | Yes |
| **Provider** | Text Input | Standard text validation | Yes |
| **Current Value** | Currency Input | Numeric validation | Yes |
| **Value Date** | Date Field | DD/MM/YYYY with shortcuts | Yes |
| **Current Contributions Amount** | Currency Input | Numeric validation | No |
| **Current Contributions Frequency** | Dropdown | Weekly, Monthly, Quarterly, Annually | No |
| **Current Contributions Type** | Text Input | Standard text validation | No |
| **Special Features** | Dropdown | Yes, No | No |
| **Special Features Details** | Text Area | Free text description (appears when Special Features = Yes) | Conditional |
| **Withdrawals Amount** | Currency Input | Numeric validation | No |
| **Withdrawals Frequency** | Dropdown | Weekly, Monthly, Quarterly, Annually | No |
| **Withdrawals Type** | Text Input | Standard text validation | No |
| **Notes** | Text Area | Free text notes | No |

### Workplace Pensions (Unmanaged)
| Field | Type | Options/Validation | Required |
|-------|------|-------------------|----------|
| **Product Owners** | Multi-select Dropdown | Select multiple product owners | Yes |
| **Employer** | Text Input | Standard text validation | Yes |
| **Plan Type** | Text Input | Standard text validation | Yes |
| **Plan Number** | Text Input | Standard text validation | Yes |
| **Provider** | Text Input | Standard text validation | Yes |
| **Current Value** | Currency Input | Numeric validation | Yes |
| **Value Date** | Date Field | DD/MM/YYYY with shortcuts | Yes |
| **Current Contributions Amount** | Currency Input | Numeric validation | No |
| **Current Contributions Frequency** | Dropdown | Weekly, Monthly, Quarterly, Annually | No |
| **Current Contributions Type** | Text Input | Standard text validation | No |
| **Special Features** | Dropdown | Yes, No | No |
| **Special Features Details** | Text Area | Free text description (appears when Special Features = Yes) | Conditional |
| **Withdrawals Amount** | Currency Input | Numeric validation | No |
| **Withdrawals Frequency** | Dropdown | Weekly, Monthly, Quarterly, Annually | No |
| **Withdrawals Type** | Text Input | Standard text validation | No |
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
| Field | Type | Options/Validation | Required |
|-------|------|-------------------|----------|
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

### Integration Points
1. **Existing IRR System**: Managed products should integrate with current portfolio/fund system
2. **Product Owner System**: Link to existing product owner management
3. **Client Group System**: Extend current client group structure
4. **Phone Management**: Consider integration with enhanced phone management system

This specification provides a comprehensive foundation for implementing Phase 2 item types while maintaining consistency with the existing Kingston's Portal architecture.