---
title: "Phase 2 API Endpoints"
tags: ["phase2", "api", "endpoints", "specifications"]
related_docs:
  - "./10_phase2_database_schema.md"
  - "../10_reference/03_phase2_user_workflows.md"
  - "./01_system_architecture_overview.md"
---

# Phase 2 API Endpoints

## API Architecture Overview

Phase 2 enhances Kingston's Portal with **supplementary API endpoints** that integrate seamlessly with the existing FastAPI infrastructure. All new endpoints follow established patterns for authentication, error handling, and response formatting.

### API Design Principles

**Consistency with Existing System**:
- All endpoints follow existing FastAPI patterns and conventions
- Consistent error response formats and status codes
- Same authentication and authorization mechanisms
- Identical request/response JSON structure patterns

**Performance Optimization**:
- **Response Times**: <500ms for list operations, <2s for complex aggregations
- **Concurrent Users**: Designed for 4 simultaneous users maximum
- **JSON Validation**: User input validation prevents malformed data storage
- **Caching Strategy**: Immutable snapshots cached, dynamic data not cached

**Security & Validation**:
- JWT token authentication on all endpoints
- Input validation using Pydantic models
- SQL injection prevention through parameterized queries
- JSON schema validation at application level

---

## Enhanced Product Owner Cards API

### GET /api/product_owners/{product_owner_id}/enhanced

**Purpose**: Retrieve enhanced product owner data with new structured fields
**Authentication**: Required
**Method**: GET

#### Enhanced Response Format

```json
{
  "product_owner": {
    "id": 123,
    "personal_details": {
      "title": "Mr",
      "first_name": "John",
      "middle_names": "Michael David",
      "surname": "Smith",
      "known_as": "John",
      "date_of_birth": "1975-06-15",
      "ni_number": "AB123456C"
    },
    "contact_details": {
      "email_address": "john.smith@email.com",
      "phone_numbers": [
        {
          "id": 1,
          "type": "mobile",
          "number": "07700 900123",
          "is_primary": true
        },
        {
          "id": 2,
          "type": "home",
          "number": "01234 567890",
          "is_primary": false
        }
      ],
      "home_address": {
        "line_1": "123 Main Street",
        "line_2": "Apartment 4B",
        "city": "London",
        "county": "Greater London",
        "postal_code": "SW1A 1AA",
        "country": "United Kingdom"
      }
    },
    "security_and_management": {
      "three_words": ["apple", "sunshine", "freedom"],
      "notes": "Prefers morning meetings, conservative investment approach",
      "next_meeting": {
        "date": "2024-09-15",
        "meeting_type": "annual_review",
        "is_nearest": true
      },
      "compliance": {
        "date_signed_tc": "2024-01-15",
        "last_signed_fee_agreement": "2024-01-15"
      }
    },
    "created_at": "2024-01-15T10:00:00Z",
    "updated_at": "2024-08-29T14:30:00Z"
  }
}
```

### PUT /api/product_owners/{product_owner_id}/personal_details

**Purpose**: Update personal details including enhanced name structure and address with professional interface support
**Authentication**: Required
**Method**: PUT

#### Request Body Schema

```json
{
  "title": "Mrs",
  "first_name": "Jane",
  "middle_names": "Elizabeth Mary",
  "surname": "Smith",
  "known_as": "Jane",
  "date_of_birth": "1978-03-22",
  "ni_number": "CD987654E",
  "home_address": {
    "line_1": "456 Oak Avenue",
    "line_2": "Apartment 7C",
    "city": "Manchester",
    "county": "Greater Manchester",
    "postal_code": "M1 1AA",
    "country": "United Kingdom"
  },
  "professional_preferences": {
    "communication_method": "email_primary",
    "meeting_preference": "in_person",
    "document_delivery": "secure_portal",
    "contact_times": "business_hours_only"
  },
  "compliance_fields": {
    "date_signed_tc": "2024-01-15",
    "last_signed_fee_agreement": "2024-01-15",
    "kyc_review_date": "2024-01-15",
    "next_compliance_review": "2025-01-15"
  }
}
```

#### Enhanced Validation Rules

**Name Structure Validation**:
- `title`: Required, 1-10 characters, predefined list (Mr, Mrs, Miss, Ms, Dr, Prof, etc.)
- `first_name`: Required, 1-50 characters, Unicode support for international names
- `middle_names`: Optional, max 150 characters (increased for multiple middle names)
- `surname`: Required, 1-50 characters, Unicode support
- `known_as`: Required for display purposes, 1-40 characters (increased for professional display)

**Address Validation**:
- `line_1`: Required, max 100 characters
- `line_2`: Optional, max 100 characters
- `postal_code`: Required, UK postcode format validation with enhanced patterns
- `city`: Required, max 60 characters (increased for compound city names)
- `county`: Optional, max 60 characters
- `country`: Default "United Kingdom", max 60 characters

**Professional Interface Enhancements**:
- All fields optimized for information-dense display
- Enhanced validation supports international clients
- Professional preferences integration for wealth management workflows
- Compliance field tracking for regulatory requirements

### POST /api/product_owners/{product_owner_id}/contacts

**Purpose**: Add new contact (phone number) with type designation
**Authentication**: Required
**Method**: POST

#### Request Body Schema

```json
{
  "contact_type": "work",
  "contact_value": "0161 123 4567",
  "is_primary": false
}
```

#### Response Format

```json
{
  "contact": {
    "id": 3,
    "product_owner_id": 123,
    "contact_type": "work",
    "contact_value": "0161 123 4567",
    "is_primary": false,
    "created_at": "2024-08-29T14:35:00Z"
  }
}
```

#### Business Rules

- **Primary Contact Management**: Only one contact can be marked as primary
- **Contact Type Validation**: Must be 'mobile', 'home', or 'work'
- **Phone Number Validation**: UK phone number format validation
- **Maximum Contacts**: Up to 5 phone numbers per product owner

### PUT /api/product_owners/{product_owner_id}/contacts/{contact_id}

**Purpose**: Update specific contact information
**Authentication**: Required
**Method**: PUT

#### Business Rules

- Cannot remove the last contact entry
- When updating primary status, automatically removes primary flag from other contacts
- Phone number format validation applied

### DELETE /api/product_owners/{product_owner_id}/contacts/{contact_id}

**Purpose**: Remove specific contact
**Authentication**: Required
**Method**: DELETE

#### Validation Rules

- Must maintain at least one contact per product owner
- If deleting primary contact, automatically reassigns primary to another contact
- Returns 409 Conflict if attempting to delete the only contact

### PUT /api/product_owners/{product_owner_id}/meeting

**Purpose**: Update meeting information with type and date (no time)
**Authentication**: Required
**Method**: PUT

#### Request Body Schema

```json
{
  "meeting_date": "2024-10-15",
  "meeting_type": "planning_meeting",
  "is_nearest": true
}
```

#### Meeting Types Supported

- `annual_review` - Annual client review meeting
- `planning_meeting` - Financial planning discussion  
- `update_meeting` - Portfolio update meeting
- `onboarding_meeting` - New client onboarding
- `compliance_meeting` - Regulatory compliance meeting
- `ad_hoc_meeting` - Unscheduled meeting

#### Response Format

```json
{
  "meeting": {
    "product_owner_id": 123,
    "meeting_date": "2024-10-15",
    "meeting_type": "planning_meeting", 
    "is_nearest": true,
    "updated_at": "2024-08-29T14:40:00Z"
  }
}
```

---

## Category-Specific Information Items API

The Phase 2 enhancement introduces **category-specific endpoints** to support the 5-table approach and hybrid card/table interface. These endpoints provide optimized responses for each of the Big 5 categories.

### Overview of Category Endpoints

| Category | Endpoint | Interface Type | Special Features |
|----------|----------|----------------|------------------|
| **basic_detail** | `/api/client_groups/{id}/basic_details` | Table | Standard table layout |
| **income_expenditure** | `/api/client_groups/{id}/income_expenditure` | Table | Item type classification |
| **assets_liabilities** | `/api/client_groups/{id}/assets_liabilities` | **Cards** | Ultra-thin cards with start_date |
| **protection** | `/api/client_groups/{id}/protection` | Table | Cover type display |
| **vulnerability_health** | `/api/client_groups/{id}/vulnerability_health` | Cards | Product owner grouping |

---

### GET /api/client_groups/{client_group_id}/basic_details

**Purpose**: Retrieve basic detail items (addresses, phones, personal info) for table display
**Authentication**: Required
**Method**: GET

#### Query Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| limit | integer | No | Results limit (default: 50, max: 200) |
| offset | integer | No | Pagination offset |
| search | string | No | Search within item names and JSON content |
| sort_by | string | No | Sort field (updated_at, name, item_type) default: updated_at |
| sort_order | string | No | Sort direction (asc, desc) default: desc |
| priority | string | No | Filter by priority (low, standard, high, critical) |
| status | string | No | Filter by status (current, outdated, pending_review, verified, archived) |

#### Response Format

```json
{
  "items": [
    {
      "id": 123,
      "item_type": "Address",
      "name": "Home Address",
      "priority": "standard", 
      "status": "current",
      "last_modified": "2024-08-27T10:30:00Z",
      "data_content": {
        "product_owners": [123, 456],  // Simple array for basic_detail category
        "address_line_one": "123 High Street",
        "address_line_two": "Manchester",
        "postcode": "M1 1AA",
        "residence_type": "Primary",
        "notes": "Current primary residence"
      },
      "last_edited_by": {
        "id": 101,
        "name": "John Advisor"
      }
    }
  ],
  "pagination": {
    "total": 15,
    "limit": 50,
    "offset": 0,
    "has_more": false
  },
  "category": "basic_detail"
}
```

---

### GET /api/client_groups/{client_group_id}/assets_liabilities

**Purpose**: Retrieve assets & liabilities for ultra-thin card interface with managed/unmanaged unification
**Authentication**: Required
**Method**: GET

#### Query Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| limit | integer | No | Results limit (default: 100, max: 500) |
| offset | integer | No | Pagination offset |
| search | string | No | Search within product names and providers |
| sort_by | string | No | Sort field (start_date, current_value, name, item_type) default: start_date |
| sort_order | string | No | Sort direction (asc, desc) default: desc |
| include_managed | boolean | No | Include managed products (default: true) |
| include_unmanaged | boolean | No | Include unmanaged information items (default: true) |
| asset_type | string | No | Filter by asset/liability type |

#### Card Format Response

```json
{
  "items": [
    {
      "id": 456,
      "type": "unmanaged", // or "managed"
      "item_type": "Cash Accounts",
      "name": "Halifax Current Account",
      "card_display": {
        "product_name": "Halifax Current Account",
        "current_value": 2500.00,
        "start_date": "15/03/2020",
        "currency": "GBP"
      },
      "managed_product_sync": null, // or sync status if managed
      "expanded_details": {
        "provider": "Halifax",
        "account_number": "***5678", // Masked for security
        "sort_code": "11-11-11",
        "associated_product_owners": {
          "association_type": "joint_tenants",
          "123": 50.00,
          "456": 50.00
        },
        "notes": "Main household account"
      },
      "last_modified": "2024-08-25T14:20:00Z"
    }
  ],
  "pagination": {
    "total": 28,
    "limit": 100,
    "offset": 0,
    "has_more": false
  },
  "unified_summary": {
    "total_assets": 245000.00,
    "total_liabilities": 185000.00,
    "net_position": 60000.00,
    "managed_items": 8,
    "unmanaged_items": 20
  },
  "category": "assets_liabilities"
}
```

---

### GET /api/client_groups/{client_group_id}/income_expenditure

**Purpose**: Retrieve income and expenditure items for table display with item type classification
**Authentication**: Required
**Method**: GET

#### Query Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| limit | integer | No | Results limit (default: 50, max: 200) |
| offset | integer | No | Pagination offset |
| search | string | No | Search within employers, sources, and descriptions |
| sort_by | string | No | Sort field (current_amount, frequency, item_type) default: current_amount |
| sort_order | string | No | Sort direction (asc, desc) default: desc |
| income_type | string | No | Filter by income/expenditure (income, expenditure) |
| frequency | string | No | Filter by frequency (Annual, Monthly, Weekly) |

#### Response Format

```json
{
  "items": [
    {
      "id": 789,
      "item_type": "Basic Salary",
      "name": "Primary Employment",
      "item_classification": "Income", // Income or Expenditure
      "priority": "high",
      "status": "current",
      "last_modified": "2024-08-20T09:15:00Z",
      "data_content": {
        "product_owners": [123],  // Simple array for income_expenditure category
        "description": "Tech Solutions Ltd",
        "amount": 45000.00,
        "frequency": "Annually",
        "date": "15/03/2024",
        "gross_net": "Gross",
        "currency": "GBP",
        "notes": "Annual review due March"
      }
    }
  ],
  "summary": {
    "total_income_annual": 52000.00,
    "total_expenditure_annual": 28000.00,
    "net_annual": 24000.00
  },
  "category": "income_expenditure"
}
```

---

### GET /api/client_groups/{client_group_id}/protection

**Purpose**: Retrieve protection policies for table display with cover type emphasis
**Authentication**: Required  
**Method**: GET

#### Response Format

```json
{
  "items": [
    {
      "id": 321,
      "item_type": "Protection Policy",
      "name": "Life Insurance Policy",
      "cover_type": "Term Life", // Emphasized over Policy Type
      "priority": "standard",
      "status": "current", 
      "last_modified": "2024-08-15T16:45:00Z",
      "data_content": {
        "provider": "Aviva",
        "policy_number": "***3456", // Masked for security
        "sum_assured": 100000.00,
        "premium_amount": 25.50,
        "premium_frequency": "Monthly",
        "policy_start_date": "01/01/2020",
        "policy_end_date": "01/01/2045",
        "associated_product_owners": {
          "association_type": "joint_tenants",
          "123": 50.00,
          "456": 50.00
        }
      }
    }
  ],
  "protection_summary": {
    "total_sum_assured": 250000.00,
    "total_annual_premiums": 1200.00,
    "policies_active": 3
  },
  "category": "protection"
}
```

---

### GET /api/client_groups/{client_group_id}/vulnerability_health

**Purpose**: Retrieve vulnerability and health items grouped by product owner for card-based display
**Authentication**: Required
**Method**: GET

#### Response Format

```json
{
  "owner_groups": [
    {
      "product_owner": {
        "id": 123,
        "name": "John Smith"
      },
      "items": [
        {
          "id": 654,
          "item_type": "Risk Questionnaire - Family", 
          "name": "Annual Risk Assessment 2024",
          "priority": "standard",
          "status": "current",
          "last_modified": "2024-08-15T11:30:00Z",
          "data_content": {
            "product_owners": [123, 456],  // Simple array for vulnerability_health category
            "questionnaire_date": "15/08/2024",
            "risk_score": 6,
            "risk_category": "Balanced",
            "investment_experience": "Some",
            "time_horizon": "10+ years"
          }
        }
      ]
    }
  ],
  "ungrouped_items": [
    {
      "id": 987,
      "item_type": "Health Issues",
      "name": "Medical Conditions",
      "data_content": {
        "product_owners": [123],  // Simple array for vulnerability_health category
        "condition_summary": "Encrypted health information",
        "last_updated": "12/07/2024"
      }
    }
  ],
  "category": "vulnerability_health"
}
```

---

## Category-Specific CRUD Operations

All category-specific endpoints support full CRUD operations with category-optimized validation and responses.

### POST Endpoints for Each Category

#### POST /api/client_groups/{client_group_id}/basic_details
#### POST /api/client_groups/{client_group_id}/income_expenditure  
#### POST /api/client_groups/{client_group_id}/assets_liabilities
#### POST /api/client_groups/{client_group_id}/protection
#### POST /api/client_groups/{client_group_id}/vulnerability_health

**Purpose**: Create new item in specific category
**Authentication**: Required
**Method**: POST

##### Request Body Schema (varies by category)

```json
{
  "item_type": "Address", // Must match category's valid item types
  "category": "basic_detail",
  "name": "Home Address", // Instance identifier
  "priority": "standard", // Optional: low, standard, high, critical
  "status": "current", // Optional: current, outdated, pending_review, verified
  "data_content": {
    "product_owners": [123, 456],  // Required: Simple array for basic_detail category
    "address_line_one": "123 High Street",
    "address_line_two": "Manchester",
    "postcode": "M1 1AA",
    "notes": "Primary residence"
  }
}
```

##### Category-Specific Validation

**Assets & Liabilities**: Requires `start_date` in data_content
**Income & Expenditure**: Requires `current_amount` and `frequency`
**Protection**: Requires `sum_assured` and `cover_type`
**Basic Detail**: Address validation for address items
**Vulnerability & Health**: Encryption validation for sensitive items

##### Response Format

```json
{
  "item": {
    "id": 123,
    "item_type": "Address",
    "name": "Home Address",
    "category": "basic_detail",
    "priority": "standard",
    "status": "current",
    "data_content": { /* full data */ },
    "created_at": "2024-08-27T10:30:00Z",
    "updated_at": "2024-08-27T10:30:00Z",
    "last_edited_by": {
      "id": 101,
      "name": "John Advisor"
    }
  }
}
```

### PUT Endpoints for Each Category

#### PUT /api/client_groups/{client_group_id}/basic_details/{item_id}
#### PUT /api/client_groups/{client_group_id}/income_expenditure/{item_id}
#### PUT /api/client_groups/{client_group_id}/assets_liabilities/{item_id}
#### PUT /api/client_groups/{client_group_id}/protection/{item_id}
#### PUT /api/client_groups/{client_group_id}/vulnerability_health/{item_id}

**Purpose**: Update existing item in specific category
**Authentication**: Required
**Method**: PUT

Request/response format same as POST with updated timestamps.

### DELETE Endpoints for Each Category

#### DELETE /api/client_groups/{client_group_id}/basic_details/{item_id}
#### DELETE /api/client_groups/{client_group_id}/income_expenditure/{item_id}
#### DELETE /api/client_groups/{client_group_id}/assets_liabilities/{item_id}
#### DELETE /api/client_groups/{client_group_id}/protection/{item_id}
#### DELETE /api/client_groups/{client_group_id}/vulnerability_health/{item_id}

**Purpose**: Delete item from specific category (soft delete with audit trail)
**Authentication**: Required
**Method**: DELETE

Response: `{"message": "Item deleted successfully", "deleted_at": "2024-08-27T10:30:00Z"}`

---

## Managed/Unmanaged Product Unification API

### GET /api/client_groups/{client_group_id}/assets_liabilities/unified

**Purpose**: Unified view of managed and unmanaged products for Assets & Liabilities cards
**Authentication**: Required
**Method**: GET

#### Unification Logic

The API automatically merges:
- **Managed products** from existing product management system
- **Unmanaged information items** from client_information_items table
- **Conflict resolution** when products appear in both systems

#### Response Format

```json
{
  "unified_items": [
    {
      "id": "managed_456", // Prefixed to indicate source
      "source": "managed",
      "product_name": "Aviva Pension Plan",
      "current_value": 125000.00,
      "start_date": "01/04/2015",
      "sync_status": "synchronized",
      "managed_product_id": 456,
      "provider": "Aviva",
      "product_type": "Personal Pension"
    },
    {
      "id": "unmanaged_789",
      "source": "unmanaged", 
      "product_name": "Halifax Savings Account",
      "current_value": 5000.00,
      "start_date": "15/03/2020",
      "item_id": 789,
      "item_type": "Cash Accounts",
      "inline_editable": true
    }
  ],
  "conflict_resolution": [
    {
      "managed_id": "managed_123",
      "unmanaged_id": "unmanaged_456", 
      "conflict_type": "duplicate_product",
      "resolution": "prefer_managed",
      "confidence": 0.95
    }
  ],
  "unification_summary": {
    "total_unified": 24,
    "managed_products": 8,
    "unmanaged_items": 16,
    "conflicts_resolved": 2
  }
}
```

---

## Performance Requirements

### Response Time Targets

| Endpoint Type | Target Response Time | Max Concurrent Users |
|---------------|---------------------|---------------------|
| Category GET requests | <500ms | 4 users |
| Card interface (A&L) | <300ms | 4 users |
| CRUD operations | <1000ms | 4 users |
| Unified product view | <800ms | 2 users |
| Search operations | <600ms | 4 users |

### Caching Strategy

**Category-Specific Caching**:
- Basic details: 5 minutes (low change frequency)
- Assets & Liabilities: No caching (high change frequency)
- Income & Expenditure: 2 minutes 
- Protection: 10 minutes (very low change frequency)
- Vulnerability & Health: 15 minutes (lowest change frequency)

---

## Error Handling

### Category-Specific Error Codes

| HTTP Status | Scenario | Response |
|-------------|----------|----------|
| 422 | Invalid item_type (Basic Personal Details) | `{"detail": "item_type 'Basic Personal Details' is not valid - this defines product owners, not client items"}` |
| 422 | Invalid item_type for category | `{"detail": "item_type 'Basic Salary' not valid for category 'basic_detail'"}` |
| 422 | Missing product_owners (basic_detail/income_expenditure) | `{"detail": "product_owners field required for basic_detail and income_expenditure items"}` |
| 422 | Missing associated_product_owners (assets_liabilities) | `{"detail": "associated_product_owners field required for assets_liabilities items"}` |
| 422 | Missing required fields | `{"detail": "start_date required for assets_liabilities category"}` |
| 422 | Ownership percentage validation | `{"detail": "Product owner percentages must total 100.00%"}` |
| 409 | Managed/unmanaged conflict | `{"detail": "Product already exists in managed system"}` |
| 403 | Sensitive data access | `{"detail": "Insufficient permissions for encrypted health data"}` |

---

## Legacy Information Items API (Maintained for Compatibility)

### GET /api/client_groups/{client_group_id}/information_items

**Purpose**: Retrieve all information items for a client group with enhanced filtering and priority/status support
**Authentication**: Required
**Method**: GET

#### Enhanced Query Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| item_type | string | No | Filter by item type (basic_detail, income_expenditure, assets_liabilities, protection, vulnerability_health) |
| item_category | string | No | Filter by specific category |
| search | string | No | Search across item categories and JSON content |
| priority | string | No | Filter by priority level (high, medium, low, none) |
| status | string | No | Filter by status (current, outdated, requires_update, archived) |
| valuation_date_range | object | No | Filter by valuation date range {"start": "2024-01-01", "end": "2024-12-31"} |
| ownership_filter | string | No | Filter by ownership type (individual, joint, tenants_in_common) |
| requires_attention | boolean | No | Show only items flagged for advisor attention |
| limit | integer | No | Pagination limit (default: 50, max: 200) |
| offset | integer | No | Pagination offset (default: 0) |
| sort_by | string | No | Sort field (updated_at, item_category, item_type, priority, valuation_amount) |
| sort_order | string | No | Sort direction (asc, desc, default: desc) |
| include_performance_data | boolean | No | Include performance metrics where available |

#### Request Example

```http
GET /api/client_groups/123/information_items?item_type=basic_detail&search=bank&limit=20&sort_by=updated_at&sort_order=desc
Authorization: Bearer <jwt_token>
Content-Type: application/json
```

#### Enhanced Response Format

```json
{
  "data": [
    {
      "id": 456,
      "client_group_id": 123,
      "item_type": "assets_liabilities",
      "item_category": "Bank Account",
      "priority": "medium",
      "status": "current",
      "requires_attention": false,
      "data_content": {
        "bank": "Barclays",
        "account_type": "Current Account",
        "latest_valuation": 2500.00,
        "valuation_date": "2024-08-26",
        "associated_product_owners": {
          "association_type": "individual",
          "789": 100.00  // Complex structure for assets_liabilities category
        }
      },
      "metadata": {
        "liquidity_score": 9.5,
        "last_performance_review": "2024-07-15",
        "next_review_due": "2024-10-15",
        "valuation_source": "bank_statement",
        "data_quality_score": 8.7,
        "advisor_notes": "Primary transaction account with regular salary deposits"
      },
      "ownership_summary": {
        "ownership_type": "individual", 
        "primary_owner": "John Smith",
        "ownership_percentage": 100.0,
        "beneficial_owners": 1
      },
      "created_at": "2024-08-20T10:30:00Z",
      "updated_at": "2024-08-26T14:15:00Z",
      "last_edited_by": 101,
      "last_edited_by_name": "John Advisor",
      "version": "2024-08-26T14:15:00Z"
    }
  ],
  "summary": {
    "total_items": 87,
    "by_priority": {
      "high": 12,
      "medium": 35,
      "low": 28,
      "none": 12
    },
    "by_status": {
      "current": 65,
      "outdated": 15,
      "requires_update": 5,
      "archived": 2
    },
    "total_valuation": 485750.50,
    "requires_attention_count": 8,
    "data_quality_average": 8.4
  },
  "pagination": {
    "total": 87,
    "limit": 20,
    "offset": 0,
    "pages": 5,
    "current_page": 1
  },
  "filters_applied": {
    "item_type": "assets_liabilities",
    "search": "bank",
    "priority": "medium",
    "status": "current"
  }
}
```

#### Error Responses

| Status | Description | Response Body |
|--------|-------------|---------------|
| 401 | Unauthorized | `{"detail": "Invalid authentication token"}` |
| 403 | Forbidden | `{"detail": "Insufficient permissions for client group 123"}` |
| 404 | Not Found | `{"detail": "Client group not found"}` |
| 422 | Validation Error | `{"detail": "Invalid item_type parameter"}` |

### POST /api/client_groups/{client_group_id}/information_items

**Purpose**: Create new information item for client group
**Authentication**: Required
**Method**: POST

#### Request Body Schema

```json
{
  "item_type": "assets_liabilities",
  "item_category": "Bank Account",
  "data_content": {
    "bank": "Halifax",
    "account_type": "Savings Account",
    "latest_valuation": 15000.00,
    "valuation_date": "2024-08-26",
    "associated_product_owners": {
      "association_type": "tenants_in_common",
      "123": 60.00,
      "456": 40.00
    }
  }
}
```

#### Validation Rules

**Required Fields**:
- `item_type`: Must be valid enum value
- `item_category`: Non-empty string, max 100 characters
- `data_content`: Valid JSON object, max 64KB

**JSON Content Validation**:
- Maximum 50 fields per JSON object
- Ownership percentages must sum to ≤100.01% (allows third-party ownership)
- Date fields must be valid ISO dates, not in future
- Numeric values must be positive for valuations

#### Response Format

```json
{
  "data": {
    "id": 458,
    "client_group_id": 123,
    "item_type": "assets_liabilities",
    "item_category": "Bank Account",
    "data_content": {
      "bank": "Halifax",
      "account_type": "Savings Account",
      "latest_valuation": 15000.00,
      "valuation_date": "2024-08-26",
      "associated_product_owners": {
        "association_type": "tenants_in_common",
        "123": 60.00,
        "456": 40.00
      }
    },
    "created_at": "2024-08-27T09:15:00Z",
    "updated_at": "2024-08-27T09:15:00Z",
    "last_edited_by": 101,
    "last_edited_by_name": "John Advisor"
  }
}
```

#### Error Responses

| Status | Description | Response Body |
|--------|-------------|---------------|
| 400 | Bad Request | `{"detail": "JSON content exceeds 64KB limit"}` |
| 422 | Validation Error | `{"detail": [{"field": "item_type", "error": "Invalid enum value"}]}` |
| 409 | Conflict | `{"detail": "Ownership percentages exceed 100%"}` |

### PUT /api/client_groups/{client_group_id}/information_items/{item_id}

**Purpose**: Update existing information item
**Authentication**: Required
**Method**: PUT

#### Request Body Schema

Same as POST endpoint, all fields optional (partial updates supported).

#### Optimistic Locking

```json
{
  "item_category": "Updated Bank Account Name",
  "data_content": {
    "latest_valuation": 16000.00,
    "valuation_date": "2024-08-27"
  },
  "_version": "2024-08-26T14:15:00Z"  // Optional for conflict detection
}
```

**Conflict Resolution**:
- If `_version` provided and doesn't match current `updated_at`, returns 409
- Response includes current item data for merge resolution
- Frontend handles conflict resolution UI

#### Response Format

Same as POST response with updated timestamps.

### DELETE /api/client_groups/{client_group_id}/information_items/{item_id}

**Purpose**: Delete information item (soft delete with audit trail)
**Authentication**: Required
**Method**: DELETE

#### Response Format

```json
{
  "message": "Information item deleted successfully",
  "deleted_item_id": 458,
  "deleted_at": "2024-08-27T10:30:00Z"
}
```

---

## Unmanaged Products API

### GET /api/client_groups/{client_group_id}/unmanaged_products

**Purpose**: Retrieve unmanaged products for client group
**Authentication**: Required
**Method**: GET

#### Query Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| product_type | string | No | Filter by product type (GIAs, Cash_ISAs, etc.) |
| status | string | No | Filter by status (active, sold, transferred, etc.) |
| provider_id | integer | No | Filter by provider |
| min_valuation | decimal | No | Minimum valuation filter |
| max_valuation | decimal | No | Maximum valuation filter |

#### Response Format

```json
{
  "data": [
    {
      "id": 789,
      "client_group_id": 123,
      "product_name": "Halifax Cash ISA",
      "product_type": "Cash_ISAs",
      "provider": {
        "id": 15,
        "name": "Halifax",
        "type": "Bank"
      },
      "latest_valuation": 20000.00,
      "valuation_date": "2024-08-26",
      "ownership_details": {
        "association_type": "joint_ownership",
        "collective_percentage": 100,
        "joint_owners": [123, 456]
      },
      "status": "active",
      "notes": "Maximum ISA allowance for tax year",
      "created_at": "2024-01-15T10:00:00Z",
      "updated_at": "2024-08-26T16:30:00Z",
      "last_edited_by_name": "Jane Advisor"
    }
  ],
  "summary": {
    "total_products": 12,
    "active_products": 10,
    "total_valuation": 285000.00,
    "by_product_type": {
      "Cash_ISAs": {"count": 3, "total_value": 60000.00},
      "GIAs": {"count": 2, "total_value": 45000.00},
      "Bank_Accounts": {"count": 5, "total_value": 25000.00}
    }
  }
}
```

### POST /api/client_groups/{client_group_id}/unmanaged_products

**Purpose**: Create new unmanaged product
**Authentication**: Required
**Method**: POST

#### Request Body Schema

```json
{
  "product_name": "Halifax Cash ISA 2024",
  "product_type": "Cash_ISAs",
  "provider_id": 15,
  "latest_valuation": 20000.00,
  "valuation_date": "2024-08-26",
  "ownership_details": {
    "association_type": "joint_ownership",
    "joint_owners": [123, 456],
    "collective_percentage": 100
  },
  "status": "active",
  "notes": "Opened at start of tax year"
}
```

#### Validation Rules

**Business Logic Validation**:
- Product name unique within client group
- Valuation must be non-negative
- Valuation date cannot be in future
- Provider must exist and be active
- Ownership percentages validated same as information items

**Ownership Validation Examples**:

```json
// Individual Ownership
{
  "association_type": "individual",
  "product_owner_id": 123
}

// Tenants in Common (must total ≤100%)
{
  "association_type": "tenants_in_common", 
  "123": 70.00,
  "456": 30.00
}

// Joint Ownership
{
  "association_type": "joint_ownership",
  "joint_owners": [123, 456, 789],
  "collective_percentage": 100
}
```

### PUT /api/client_groups/{client_group_id}/unmanaged_products/{product_id}/status

**Purpose**: Update product status (lifecycle management)
**Authentication**: Required
**Method**: PUT

#### Request Body Schema

```json
{
  "status": "sold",
  "notes": "Transferred to managed GIA on 2024-08-27",
  "status_date": "2024-08-27"
}
```

#### Status Transitions

| From Status | To Status | Notes |
|-------------|-----------|-------|
| active | sold | Product liquidated |
| active | transferred | Moved to managed product |
| active | matured | Product reached maturity |
| active | cancelled | Product cancelled |
| * | active | Reactivate (admin only) |

---

## Networth Statements API

### GET /api/client_groups/{client_group_id}/networth/current

**Purpose**: Generate real-time networth statement data organized by item types with enhanced summary cards and dynamic column headers
**Authentication**: Required
**Method**: GET

#### Enhanced Response Format with Liquidity-Based Ordering
```json
{
  "networth_data": {
    "client_info": {
      "client_group_id": 123,
      "product_owners": [
        {"id": 456, "known_as": "John", "full_name": "John Smith"},
        {"id": 789, "known_as": "Mary", "full_name": "Mary Smith"}
      ]
    },
    "item_types": [
      {
        "type": "Bank Accounts",
        "liquidity_category": "cash_equivalents",
        "display_order": 1,
        "items": [
          {
            "name": "Halifax Current Account",
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
        ],
        "subtotal": {
          "john": 2250,
          "mary": 1750,
          "joint": 4500,
          "total": 8500
        }
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
        ],
        "subtotal": {
          "john": 15000,
          "mary": 20000,
          "joint": 0,
          "total": 35000
        }
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
        ],
        "subtotal": {
          "john": 45000,
          "mary": 38000,
          "joint": 0,
          "total": 83000
        }
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
        ],
        "subtotal": {
          "john": 125000,
          "mary": 95000,
          "joint": 0,
          "total": 220000
        }
      }
    ],
    "summary": {
      "managed_total": 224000,
      "unmanaged_total": 4500, 
      "total_assets": 228500,
      "total_liabilities": 25000,
      "net_worth": 203500,
      "change_since_last": {
        "value": 12500,
        "percentage": 6.5,
        "period_display": "Apr 24 to Aug 25",
        "last_snapshot_date": "2024-04-15",
        "last_snapshot_net_worth": 191000,
        "current_date": "2024-08-29"
      }
    }
  },
  "display_requirements": {
    "table_structure": "hierarchical_by_item_type",
    "styling": "professional_monochromatic",
    "column_headers": {
      "owner_columns": ["John", "Mary", "Joint"],
      "header_source": "known_as_from_product_owners"
    },
    "summary_card_order": ["Net Worth", "Assets", "Liabilities", "Change"],
    "managed_status_indicators": true,
    "zero_value_display": "em_dash"
  },
  "ordering_metadata": {
    "applied_hierarchy": "liquidity_based",
    "ordering_principle": "most_liquid_to_least_liquid",
    "reports_page_consistency": true,
    "liquidity_categories": [
      "cash_equivalents",
      "accessible_investments", 
      "retirement_investments",
      "illiquid_investments",
      "personal_assets",
      "liabilities"
    ],
    "special_rules": {
      "cash_isas_before_stocks_shares": true,
      "managed_before_unmanaged_within_type": true,
      "liabilities_always_last": true
    }
  }
}

#### Query Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| include_managed | boolean | No | Include managed products (default: true) |
| include_unmanaged | boolean | No | Include unmanaged products (default: true) |
| include_items | boolean | No | Include information items (default: true) |
| group_by | string | No | Grouping method (product_type, owner, category) |
| ordering | string | No | Asset ordering method (liquidity_based, alphabetical, reports_page) default: liquidity_based |
| apply_reports_consistency | boolean | No | Apply reports page consistency where applicable (default: true) |

#### Legacy Response Format (Deprecated)

**Note**: This response format is maintained for backward compatibility but will be deprecated in favor of the enhanced hierarchical structure above.

```json
{
  "client_group": {
    "id": 123,
    "name": "Smith Family Trust",
    "product_owners": [
      {"id": 123, "name": "John Smith", "known_as": "John", "inception_date": "2020-01-15"},
      {"id": 456, "name": "Jane Smith", "known_as": "Mary", "inception_date": "2020-01-15"}
    ]
  },
  "statement_data": {
    "generated_at": "2024-08-27T10:30:00Z",
    "sections": [
      {
        "section_name": "GIAs",
        "section_type": "asset",
        "items": [
          {
            "id": 101,
            "name": "Zurich GIA (Managed)",
            "type": "managed_product",
            "is_managed": true,
            "current_valuation": 25000.00,
            "valuation_date": "2024-08-26",
            "ownership": {
              "john": 25000.00,
              "mary": 0.00,
              "joint": 0.00
            }
          },
          {
            "id": 202,
            "name": "Halifax GIA (Unmanaged)",
            "type": "unmanaged_product",
            "is_managed": false,
            "current_valuation": 15000.00,
            "valuation_date": "2024-08-26",
            "ownership": {
              "john": 7500.00,
              "mary": 7500.00,
              "joint": 0.00
            }
          }
        ],
        "section_totals": {
          "john": 32500.00,
          "mary": 7500.00,
          "joint": 0.00,
          "total": 40000.00
        }
      }
    ],
    "statement_totals": {
      "total_assets": 340000.00,
      "total_liabilities": 45000.00,
      "net_worth": 295000.00,
      "change_since_last": {
        "value": 12500,
        "percentage": 3.8,
        "period_display": "Apr 24 to Aug 25"
      },
      "by_owner": {
        "john": {"assets": 170000.00, "liabilities": 22500.00, "net": 147500.00},
        "mary": {"assets": 170000.00, "liabilities": 22500.00, "net": 147500.00}
      }
    }
  }
}
```

### POST /api/client_groups/{client_group_id}/networth/snapshot

**Purpose**: Create historical networth statement snapshot
**Authentication**: Required
**Method**: POST

#### Request Body Schema

```json
{
  "statement_name": "Pre-Investment Review - August 2024",
  "include_sections": {
    "managed_products": true,
    "unmanaged_products": true,
    "information_items": true
  },
  "custom_adjustments": [
    {
      "item_id": 123,
      "item_type": "managed_product",
      "adjusted_valuation": 26000.00,
      "adjustment_reason": "Mid-month valuation for decision point"
    }
  ]
}
```

#### Processing Flow

1. **Data Collection** (1-2 seconds): Gather all current data
2. **Validation** (0.5 seconds): Verify data consistency
3. **Snapshot Creation** (1-2 seconds): Store immutable record
4. **Confirmation** (immediate): Return snapshot ID and summary

#### Response Format

```json
{
  "snapshot": {
    "id": 789,
    "client_group_id": 123,
    "statement_name": "Pre-Investment Review - August 2024",
    "created_at": "2024-08-27T10:30:00Z",
    "created_by": 101,
    "created_by_name": "John Advisor",
    "total_assets": 340000.00,
    "total_liabilities": 45000.00,
    "net_worth": 295000.00
  },
  "summary": {
    "items_captured": 45,
    "managed_products": 8,
    "unmanaged_products": 12,
    "information_items": 25,
    "product_owners_included": 2
  }
}
```

### GET /api/client_groups/{client_group_id}/networth/snapshots

**Purpose**: Retrieve historical snapshots list
**Authentication**: Required
**Method**: GET

#### Query Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| limit | integer | No | Number of snapshots (default: 10) |
| created_after | datetime | No | Filter snapshots created after date |
| created_by | integer | No | Filter by advisor who created |

#### Response Format

```json
{
  "snapshots": [
    {
      "id": 789,
      "statement_name": "Pre-Investment Review - August 2024",
      "created_at": "2024-08-27T10:30:00Z",
      "created_by_name": "John Advisor",
      "net_worth": 295000.00,
      "items_count": 45
    },
    {
      "id": 756,
      "statement_name": "Annual Review 2024",
      "created_at": "2024-03-15T14:00:00Z",
      "created_by_name": "Jane Advisor", 
      "net_worth": 278000.00,
      "items_count": 42
    }
  ],
  "pagination": {
    "total": 8,
    "showing": 2
  }
}
```

### GET /api/client_groups/{client_group_id}/networth/snapshots/{snapshot_id}

**Purpose**: Retrieve specific historical snapshot data
**Authentication**: Required
**Method**: GET

**Response**: Same structure as current networth but with historical data from snapshot timestamp.

---

## KYC Report Generation API

### POST /api/client_groups/{client_group_id}/kyc-report/generate

**Purpose**: Generate KYC report with customizable sections
**Authentication**: Required
**Method**: POST

#### Request Body Schema

```json
{
  "report_options": {
    "include_sections": {
      "personal_details": true,
      "employment_details": true,
      "financial_position": true,
      "investment_experience": true,
      "objectives": true,
      "risk_assessment": true
    },
    "data_source": "current",  // or "snapshot_id": 789
    "custom_fields": {
      "advisor_notes": "Client prioritizes capital preservation over growth",
      "risk_tolerance": "Conservative - prefers guaranteed returns",
      "investment_timeline": "Long-term, 10+ year horizon"
    },
    "format_options": {
      "include_charts": false,
      "detailed_ownership": true,
      "show_historical_performance": true
    }
  }
}
```

#### Response Format

```json
{
  "report_generation": {
    "request_id": "kyc_789_20240827_103045",
    "status": "completed",
    "generated_at": "2024-08-27T10:30:45Z",
    "processing_time_seconds": 8.2,
    "data_completeness": {
      "overall_score": 85.5,
      "section_scores": {
        "personal_details": 92.0,
        "employment_details": 78.0,
        "financial_position": 95.0,
        "investment_experience": 88.0,
        "objectives": 70.0
      },
      "missing_data_alerts": [
        "Employment end date not specified",
        "Risk tolerance questionnaire not completed"
      ]
    }
  },
  "report_content": {
    "sections": [
      {
        "section_id": "personal_details",
        "section_title": "Personal Details",
        "auto_populated": true,
        "data": {
          "primary_client": {
            "name": "John Smith",
            "date_of_birth": "1975-06-15",
            "address": "1 New Street, Neverland, N0TH 3R3",
            "marital_status": "Married",
            "employment": "Software Engineer"
          },
          "spouse": {
            "name": "Jane Smith",
            "date_of_birth": "1978-03-22",
            "employment": "Marketing Manager"
          }
        }
      },
      {
        "section_id": "financial_position",
        "section_title": "Current Financial Position",
        "auto_populated": true,
        "data": {
          "assets": {
            "managed_investments": 185000.00,
            "unmanaged_investments": 95000.00,
            "property": 300000.00,
            "cash_accounts": 25000.00,
            "total_assets": 605000.00
          },
          "liabilities": {
            "mortgage": 180000.00,
            "loans": 0.00,
            "total_liabilities": 180000.00
          },
          "net_worth": 425000.00
        }
      }
    ]
  },
  "download": {
    "pdf_url": "/api/client_groups/123/kyc-report/download/kyc_789_20240827_103045.pdf",
    "expires_at": "2024-08-27T22:30:45Z"  // 12-hour expiry
  }
}
```

### GET /api/client_groups/{client_group_id}/kyc-report/template

**Purpose**: Get KYC report template structure for customization
**Authentication**: Required
**Method**: GET

#### Response Format

```json
{
  "template": {
    "version": "2024.1",
    "sections": [
      {
        "id": "personal_details", 
        "title": "Personal Details",
        "required": true,
        "auto_populate": true,
        "fields": [
          {
            "field_id": "full_name",
            "field_type": "text",
            "required": true,
            "data_source": "basic_detail_items",
            "validation": "non_empty"
          },
          {
            "field_id": "date_of_birth",
            "field_type": "date",
            "required": true,
            "data_source": "basic_detail_items"
          }
        ]
      },
      {
        "id": "objectives",
        "title": "Client Objectives",
        "required": false,
        "auto_populate": true,
        "manual_input": true,
        "fields": [
          {
            "field_id": "primary_objective",
            "field_type": "text_area",
            "required": false,
            "data_source": "client_objectives",
            "manual_override": true
          }
        ]
      }
    ]
  },
  "customization_options": {
    "section_reordering": true,
    "section_inclusion": true,
    "custom_fields": true,
    "branding_options": ["header_logo", "footer_text", "color_scheme"]
  }
}
```

---

## Rate Limiting Strategy

### Implementation Framework

**4-User Concurrent Limit Design**:
- **Redis-Based Tracking**: Track active sessions and request patterns
- **Per-User Limits**: 60 requests per minute for standard operations
- **Bulk Operation Limits**: 5 bulk operations per hour per user
- **Report Generation Limits**: 10 reports per hour per user
- **Real-time Operation Limits**: 20 concurrent WebSocket connections

#### Rate Limiting Middleware Configuration

```python
# FastAPI rate limiting middleware implementation
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded

limiter = Limiter(key_func=lambda request: request.user.id if hasattr(request, 'user') else get_remote_address(request))

# Rate limit decorators for different endpoint types
@limiter.limit("60/minute")
@router.get("/information_items")
async def get_information_items(...):
    pass

@limiter.limit("5/hour") 
@router.post("/bulk_import")
async def bulk_import(...):
    pass

@limiter.limit("10/hour")
@router.post("/kyc-report/generate")
async def generate_kyc_report(...):
    pass
```

#### Rate Limit Response Headers

All responses include rate limiting information:

```http
HTTP/1.1 200 OK
X-RateLimit-Limit: 60
X-RateLimit-Remaining: 45
X-RateLimit-Reset: 1693392000
X-RateLimit-Reset-After: 45
Retry-After: 45
```

#### Rate Limit Exceeded Response

```json
{
  "error": {
    "code": "RATE_LIMIT_EXCEEDED",
    "message": "Rate limit exceeded for user operations",
    "details": {
      "limit": 60,
      "window": "60 seconds",
      "reset_at": "2024-08-27T10:31:00Z",
      "retry_after": 45
    },
    "correlation_id": "rl_789_20240827_103015",
    "timestamp": "2024-08-27T10:30:15Z"
  }
}
```

#### Adaptive Rate Limiting

**User Activity Patterns**:
- **Standard Users**: 60 requests/minute
- **Heavy Report Users**: Auto-adjusted to 80 requests/minute after pattern detection
- **Bulk Operation Users**: 5 bulk ops/hour with burst allowance of 2 additional
- **System Load Adaptive**: Limits reduced by 25% when >3 concurrent users active

```python
# Dynamic rate limiting based on system load
class AdaptiveRateLimiter:
    def __init__(self):
        self.base_limits = {"standard": 60, "bulk": 5, "reports": 10}
        self.current_users = 0
    
    def get_adjusted_limit(self, operation_type: str) -> int:
        base_limit = self.base_limits[operation_type]
        if self.current_users > 3:
            return int(base_limit * 0.75)  # Reduce by 25%
        return base_limit
```

---

## Error Tracking Framework

### Comprehensive Error Context

**Enhanced Error Response Format**:
All API responses now include correlation IDs and comprehensive debugging context.

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Request validation failed", 
    "correlation_id": "err_789_20240827_103045_a1b2c3d4",
    "request_id": "req_789_20240827_103045",
    "timestamp": "2024-08-27T10:30:45Z",
    "user_context": {
      "user_id": 101,
      "client_group_id": 123,
      "session_id": "sess_20240827_101500"
    },
    "performance_metrics": {
      "response_time_ms": 250,
      "database_query_time_ms": 120,
      "validation_time_ms": 45
    },
    "details": [
      {
        "field": "latest_valuation",
        "error": "Value must be non-negative",
        "received_value": -1500.00,
        "validation_rule": "financial_value_positive",
        "suggested_fix": "Ensure valuation amount is 0 or greater"
      }
    ],
    "debug_context": {
      "endpoint": "/api/client_groups/123/information_items",
      "method": "POST",
      "database_queries": 3,
      "cache_hits": 2,
      "cache_misses": 1
    }
  }
}
```

### Correlation ID Generation

**Format**: `{prefix}_{client_group_id}_{timestamp}_{random_hash}`
**Examples**:
- `req_123_20240827_103045_a1b2c3d4` (Request ID)
- `err_123_20240827_103045_e5f6g7h8` (Error ID)
- `bulk_123_20240827_103045_i9j0k1l2` (Bulk Operation ID)

```python
import uuid
import time
from typing import Optional

def generate_correlation_id(prefix: str, client_group_id: Optional[int] = None) -> str:
    timestamp = int(time.time())
    random_suffix = str(uuid.uuid4())[:8]
    
    if client_group_id:
        return f"{prefix}_{client_group_id}_{timestamp}_{random_suffix}"
    return f"{prefix}_{timestamp}_{random_suffix}"

# Usage in FastAPI dependency
async def add_correlation_id(request: Request):
    correlation_id = generate_correlation_id("req", getattr(request, 'client_group_id', None))
    request.state.correlation_id = correlation_id
    return correlation_id
```

### Error Categorization and Alerting

**Error Categories**:
1. **User Input Errors** (400, 422): No alerts, logged for pattern analysis
2. **Authentication Errors** (401, 403): Alert after 3 failures in 5 minutes
3. **System Errors** (500): Immediate alert to development team
4. **Performance Errors** (>2s response): Alert after 5 occurrences in 10 minutes
5. **Concurrent User Conflicts** (409): Tracked for user experience optimization

```python
# Error monitoring and alerting system
class ErrorMonitor:
    def __init__(self):
        self.error_counts = defaultdict(int)
        self.alert_thresholds = {
            "auth_failure": {"count": 3, "window": 300},  # 3 in 5 minutes
            "system_error": {"count": 1, "window": 60},   # 1 in 1 minute
            "performance_degradation": {"count": 5, "window": 600}  # 5 in 10 minutes
        }
    
    async def track_error(self, error_type: str, correlation_id: str, context: dict):
        # Log error with full context
        await self.log_error(error_type, correlation_id, context)
        
        # Check if alert threshold reached
        if self.should_alert(error_type):
            await self.send_alert(error_type, correlation_id, context)
```

### Performance Tracking Integration

**Request Performance Metrics**:
Every API response includes performance context for debugging:

```json
{
  "data": [...],
  "meta": {
    "correlation_id": "req_123_20240827_103045_a1b2c3d4",
    "performance": {
      "total_time_ms": 245,
      "database_time_ms": 120,
      "validation_time_ms": 45,
      "json_processing_time_ms": 30,
      "authorization_time_ms": 15
    },
    "resource_usage": {
      "database_queries": 3,
      "cache_operations": {"hits": 2, "misses": 1},
      "memory_usage_mb": 12.5
    }
  }
}
```

---

## Enhanced Bulk Operations

### Batch CRUD Operations

#### POST /api/client_groups/{client_group_id}/information_items/batch

**Purpose**: Create multiple information items in single transaction
**Authentication**: Required
**Method**: POST
**Rate Limit**: 5 operations/hour

##### Request Body Schema

```json
{
  "items": [
    {
      "item_type": "assets_liabilities",
      "item_category": "Bank Account",
      "data_content": {
        "bank": "Halifax",
        "account_type": "Current Account",
        "latest_valuation": 5000.00,
        "valuation_date": "2024-08-26",
        "associated_product_owners": {
          "association_type": "individual",
          "123": 100.00  // Complex structure for assets_liabilities category
        }
      }
    },
    {
      "item_type": "assets_liabilities",
      "item_category": "Savings Account",
      "data_content": {
        "bank": "Barclays",
        "account_type": "ISA",
        "latest_valuation": 15000.00,
        "valuation_date": "2024-08-26",
        "associated_product_owners": {
          "association_type": "joint_tenants",
          "123": 50.00,  // Complex structure for assets_liabilities category
          "456": 50.00
        }
      }
    }
  ],
  "batch_options": {
    "transaction_mode": "atomic",  // atomic | partial
    "validation_mode": "strict",  // strict | permissive
    "conflict_resolution": "skip", // skip | overwrite | merge
    "max_items": 100
  }
}
```

##### Response Format

```json
{
  "batch_result": {
    "correlation_id": "batch_123_20240827_103045_i9j0k1l2",
    "total_items": 2,
    "successful_items": 2,
    "failed_items": 0,
    "skipped_items": 0,
    "processing_time_ms": 1250
  },
  "created_items": [
    {
      "batch_index": 0,
      "item_id": 890,
      "status": "created",
      "item_category": "Bank Account"
    },
    {
      "batch_index": 1,
      "item_id": 891,
      "status": "created", 
      "item_category": "Savings Account"
    }
  ],
  "errors": [],
  "warnings": [
    {
      "batch_index": 1,
      "warning": "Valuation date is more than 30 days old",
      "severity": "low"
    }
  ]
}
```

#### PUT /api/client_groups/{client_group_id}/information_items/batch

**Purpose**: Update multiple information items
**Method**: PUT
**Rate Limit**: 5 operations/hour

```json
{
  "updates": [
    {
      "item_id": 890,
      "data_content": {
        "latest_valuation": 5500.00,
        "valuation_date": "2024-08-27"
      },
      "_version": "2024-08-26T14:15:00Z"
    }
  ],
  "batch_options": {
    "optimistic_locking": true,
    "return_updated_items": true
  }
}
```

#### POST /api/client_groups/{client_group_id}/unmanaged_products/batch

**Purpose**: Batch create unmanaged products
**Method**: POST  
**Rate Limit**: 3 operations/hour

```json
{
  "products": [
    {
      "product_name": "Halifax ISA 2024",
      "product_type": "Cash_ISAs",
      "provider_id": 15,
      "latest_valuation": 20000.00,
      "ownership_details": {
        "association_type": "individual",
        "product_owner_id": 123
      }
    }
  ],
  "validation_options": {
    "check_duplicates": true,
    "validate_ownership_totals": true,
    "require_unique_names": true
  }
}
```

### CSV/Excel Bulk Import Enhancement

#### POST /api/client_groups/{client_group_id}/bulk_import

**Purpose**: Bulk import information items from CSV/Excel
**Authentication**: Required
**Method**: POST
**Content-Type**: multipart/form-data

#### Request Format

```http
POST /api/client_groups/123/bulk_import
Authorization: Bearer <jwt_token>
Content-Type: multipart/form-data

file: [CSV/Excel file]
import_options: {
  "item_type": "assets_liabilities",
  "default_category": "Bank Account", 
  "mapping": {
    "column_1": "bank_name",
    "column_2": "account_type",
    "column_3": "latest_valuation",
    "column_4": "valuation_date"
  },
  "validation_mode": "strict", // strict | permissive
  "duplicate_handling": "skip" // skip | overwrite | create_new
}
```

#### Enhanced Processing Flow

1. **File Validation** (immediate): Check file format, size (max 10MB), and structure
2. **Correlation ID Assignment**: Generate unique tracking ID for entire import
3. **Data Preview** (5-10 seconds): Return first 10 rows with validation preview
4. **User Confirmation** (manual): User confirms mapping and proceeds with import
5. **Validation Phase** (varies): Validate all data with detailed error reporting
6. **Transaction Processing** (1-5 minutes): Atomic import with rollback capability
7. **Results & Audit Trail** (immediate): Complete success/error summary with audit log

#### Enhanced Response Format

```json
{
  "import_summary": {
    "correlation_id": "bulk_123_20240827_103045_x1y2z3a4",
    "total_rows": 150,
    "successful_imports": 142,
    "failed_imports": 8,
    "duplicates_skipped": 5,
    "processing_time_seconds": 45.2,
    "file_info": {
      "filename": "client_assets_august_2024.xlsx",
      "file_size_mb": 2.3,
      "sheet_name": "Assets"
    },
    "performance_metrics": {
      "validation_time_seconds": 12.5,
      "database_time_seconds": 28.7,
      "memory_peak_mb": 45.2
    }
  },
  "errors": [
    {
      "row": 15,
      "correlation_id": "err_bulk_123_20240827_103045_row15",
      "error_type": "validation_error",
      "error": "Invalid valuation date format",
      "field": "valuation_date",
      "received_value": "invalid-date",
      "expected_format": "YYYY-MM-DD",
      "suggested_fix": "Use format like 2024-08-27",
      "data": {"bank_name": "HSBC", "account_type": "Current"}
    }
  ],
  "created_items": [
    {"row": 1, "item_id": 890, "category": "Bank Account", "valuation": 5000.00},
    {"row": 2, "item_id": 891, "category": "Bank Account", "valuation": 3500.00}
  ],
  "warnings": [
    {
      "row": 25,
      "warning": "Valuation date is more than 6 months old",
      "severity": "medium",
      "item_id": 892
    }
  ],
  "audit_trail": {
    "import_id": "bulk_123_20240827_103045",
    "user_id": 101,
    "started_at": "2024-08-27T10:30:45Z",
    "completed_at": "2024-08-27T10:31:30Z"
  }
}
```

---

## Real-time Updates API

### WebSocket Concurrent User Management

**Purpose**: Real-time updates for 4 concurrent users working on same client group

#### WebSocket Connection Endpoint

```
ws://localhost:8001/api/client_groups/{client_group_id}/realtime
?token=<jwt_token>&user_id=101&session_id=sess_20240827_101500
```

#### Connection Management

```python
from fastapi import WebSocket, WebSocketDisconnect
from typing import Dict, List

class ConcurrentUserManager:
    def __init__(self):
        self.active_connections: Dict[int, List[WebSocket]] = {}
        self.user_presence: Dict[int, Dict] = {}
    
    async def connect(self, websocket: WebSocket, client_group_id: int, user_id: int):
        await websocket.accept()
        
        if client_group_id not in self.active_connections:
            self.active_connections[client_group_id] = []
        
        self.active_connections[client_group_id].append(websocket)
        self.user_presence[client_group_id] = self.user_presence.get(client_group_id, {})
        self.user_presence[client_group_id][user_id] = {
            "connected_at": datetime.utcnow(),
            "last_activity": datetime.utcnow(),
            "current_page": None
        }
        
        # Notify other users of new connection
        await self.broadcast_user_presence(client_group_id)
```

#### Real-time Message Types

##### 1. User Presence Updates

```json
{
  "type": "user_presence",
  "correlation_id": "ws_123_20240827_103045",
  "data": {
    "active_users": [
      {
        "user_id": 101,
        "user_name": "John Advisor",
        "connected_at": "2024-08-27T10:30:00Z",
        "current_page": "/client_groups/123/information_items",
        "last_activity": "2024-08-27T10:35:00Z"
      },
      {
        "user_id": 102,
        "user_name": "Jane Advisor",
        "connected_at": "2024-08-27T10:32:00Z",
        "current_page": "/client_groups/123/networth",
        "last_activity": "2024-08-27T10:36:00Z"
      }
    ],
    "total_active_users": 2
  }
}
```

##### 2. Data Change Notifications

```json
{
  "type": "data_change",
  "correlation_id": "change_123_20240827_103045_m5n6o7p8",
  "data": {
    "change_type": "information_item_updated",
    "entity_id": 456,
    "entity_type": "information_item",
    "changed_by": {
      "user_id": 101,
      "user_name": "John Advisor"
    },
    "changed_at": "2024-08-27T10:35:30Z",
    "changes": {
      "latest_valuation": {
        "old_value": 5000.00,
        "new_value": 5500.00
      },
      "valuation_date": {
        "old_value": "2024-08-26",
        "new_value": "2024-08-27"
      }
    },
    "affected_sections": ["networth", "assets_summary"]
  }
}
```

##### 3. Conflict Warnings

```json
{
  "type": "conflict_warning",
  "correlation_id": "conflict_123_20240827_103045_q9r0s1t2",
  "data": {
    "warning_type": "concurrent_edit_detected",
    "entity_id": 456,
    "entity_type": "information_item",
    "conflicting_users": [
      {"user_id": 101, "user_name": "John Advisor"},
      {"user_id": 102, "user_name": "Jane Advisor"}
    ],
    "lock_acquired_by": {
      "user_id": 101,
      "user_name": "John Advisor",
      "acquired_at": "2024-08-27T10:35:00Z"
    },
    "estimated_completion": "2024-08-27T10:37:00Z"
  }
}
```

#### Server-Sent Events (SSE) Alternative

**Endpoint**: `GET /api/client_groups/{client_group_id}/realtime/sse`

```http
GET /api/client_groups/123/realtime/sse
Authorization: Bearer <jwt_token>
Accept: text/event-stream
Cache-Control: no-cache
```

**Response Stream**:

```
event: user_presence
id: 1693392000
data: {"active_users": [...], "total_active_users": 2}

event: data_change  
id: 1693392030
data: {"change_type": "information_item_updated", "entity_id": 456, ...}

event: heartbeat
id: 1693392060
data: {"timestamp": "2024-08-27T10:36:00Z", "active_connections": 3}
```

### Optimistic Locking Enhancement

#### Enhanced Conflict Detection

**PUT requests with optimistic locking**:

```json
{
  "item_category": "Updated Bank Account",
  "data_content": {
    "latest_valuation": 6000.00
  },
  "_version": "2024-08-27T10:35:00Z",
  "_edit_context": {
    "user_id": 101,
    "session_id": "sess_20240827_101500",
    "page_url": "/client_groups/123/information_items/456/edit",
    "edit_started_at": "2024-08-27T10:34:30Z"
  }
}
```

**Conflict Resolution Response**:

```json
{
  "error": {
    "code": "OPTIMISTIC_LOCK_CONFLICT",
    "message": "Item was modified by another user",
    "correlation_id": "conflict_123_20240827_103545_u3v4w5x6",
    "conflict_details": {
      "current_version": "2024-08-27T10:36:00Z",
      "submitted_version": "2024-08-27T10:35:00Z",
      "conflicting_user": {
        "user_id": 102,
        "user_name": "Jane Advisor",
        "modified_at": "2024-08-27T10:36:00Z"
      },
      "merge_options": {
        "auto_merge_possible": false,
        "conflicting_fields": ["latest_valuation", "valuation_date"],
        "safe_to_overwrite": ["notes"]
      }
    },
    "current_data": {
      "item_category": "Halifax Current Account",
      "data_content": {
        "latest_valuation": 5800.00,
        "valuation_date": "2024-08-27",
        "notes": "Updated by Jane"
      },
      "updated_at": "2024-08-27T10:36:00Z",
      "last_edited_by_name": "Jane Advisor"
    }
  }
}
```

### Webhook Integration

#### POST /api/webhooks/client_groups/{client_group_id}/subscribe

**Purpose**: Subscribe to data change webhooks for external system integration

```json
{
  "webhook_url": "https://external-system.com/webhooks/kingstons-portal",
  "events": [
    "information_item.created",
    "information_item.updated", 
    "information_item.deleted",
    "unmanaged_product.created",
    "networth.snapshot_created"
  ],
  "secret": "webhook_secret_key_for_verification",
  "retry_policy": {
    "max_retries": 3,
    "retry_delay_seconds": 30
  }
}
```

**Webhook Payload Example**:

```json
{
  "event": "information_item.updated",
  "correlation_id": "webhook_123_20240827_103545_y7z8a9b0",
  "timestamp": "2024-08-27T10:35:45Z",
  "client_group_id": 123,
  "data": {
    "entity_id": 456,
    "entity_type": "information_item",
    "changes": {
      "latest_valuation": {"old": 5000.00, "new": 5500.00}
    },
    "changed_by": {
      "user_id": 101,
      "user_name": "John Advisor"
    }
  },
  "signature": "sha256=a1b2c3d4e5f6..."
}
```

---

## Search and Filtering API

### GET /api/client_groups/{client_group_id}/search

**Purpose**: Universal search across all client data types
**Authentication**: Required
**Method**: GET

#### Query Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| q | string | Yes | Search query (minimum 3 characters) |
| types | string | No | Comma-separated data types to search |
| limit | integer | No | Results limit (default: 20, max: 100) |
| highlight | boolean | No | Include search term highlighting |

#### Data Types Searchable

- `information_items`: JSON content and categories
- `unmanaged_products`: Product names and notes
- `managed_products`: Product names (via existing integration)
- `actions`: Action names and descriptions
- `objectives`: Objective titles and descriptions
- `networth_snapshots`: Snapshot names

#### Response Format

```json
{
  "search_results": {
    "query": "halifax account",
    "total_results": 8,
    "results_by_type": {
      "information_items": 3,
      "unmanaged_products": 2,
      "managed_products": 1,
      "actions": 2
    },
    "results": [
      {
        "type": "information_items",
        "item_id": 456,
        "title": "Halifax Current Account",
        "category": "Bank Account",
        "match_score": 0.95,
        "highlighted_content": "Halifax Current <em>Account</em> with recent deposits",
        "last_updated": "2024-08-26T14:15:00Z"
      },
      {
        "type": "unmanaged_products",
        "item_id": 789,
        "title": "Halifax Cash ISA 2024",
        "category": "Cash_ISAs",
        "match_score": 0.87,
        "valuation": 20000.00,
        "last_updated": "2024-08-26T16:30:00Z"
      }
    ]
  },
  "search_performance": {
    "query_time_ms": 145,
    "total_documents_searched": 1250
  }
}
```

---

## Enhanced Error Handling and Response Formats

### Comprehensive Error Response Format

All endpoints now use enhanced error formatting with correlation IDs and performance context:

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Request validation failed",
    "correlation_id": "err_123_20240827_103045_a1b2c3d4",
    "request_id": "req_123_20240827_103045",
    "timestamp": "2024-08-27T10:30:45Z",
    "user_context": {
      "user_id": 101,
      "client_group_id": 123,
      "session_id": "sess_20240827_101500",
      "concurrent_users": 2
    },
    "performance_metrics": {
      "response_time_ms": 250,
      "database_query_time_ms": 120,
      "validation_time_ms": 45,
      "rate_limit_check_ms": 15
    },
    "details": [
      {
        "field": "latest_valuation",
        "error": "Value must be non-negative",
        "received_value": -1500.00,
        "validation_rule": "financial_value_positive",
        "suggested_fix": "Ensure valuation amount is 0 or greater",
        "help_url": "/docs/validation-rules#financial-values"
      }
    ],
    "debug_context": {
      "endpoint": "/api/client_groups/123/information_items",
      "method": "POST",
      "rate_limit_remaining": 45,
      "database_queries": 3,
      "cache_performance": {"hits": 2, "misses": 1}
    },
    "retry_info": {
      "retryable": false,
      "retry_after_seconds": null,
      "max_retries": null
    }
  }
}
```

### Enhanced HTTP Status Codes

| Status | Usage | Example Scenarios | Correlation ID Required |
|--------|-------|------------------|------------------------|
| 200 | Success | Successful GET requests | Yes |
| 201 | Created | Successful POST requests | Yes |
| 400 | Bad Request | Invalid request format, JSON parsing errors | Yes |
| 401 | Unauthorized | Invalid or expired JWT token | Yes |
| 403 | Forbidden | Insufficient permissions for client group | Yes |
| 404 | Not Found | Client group, item, or resource not found | Yes |
| 409 | Conflict | Optimistic locking conflicts, concurrent edits | Yes |
| 422 | Unprocessable Entity | Business rule validation failures | Yes |
| 429 | Too Many Requests | **Rate limiting now implemented** | Yes |
| 500 | Internal Server Error | System errors, database connectivity issues | Yes |
| 503 | Service Unavailable | System overload, >4 concurrent users | Yes |

### Validation Error Details

```json
{
  "error": {
    "code": "OWNERSHIP_VALIDATION_ERROR",
    "message": "Ownership percentages validation failed",
    "details": [
      {
        "field": "ownership_details",
        "error": "Percentages sum to 105.5%, exceeds maximum of 100%",
        "breakdown": {
          "123": 60.5,
          "456": 45.0,
          "total": 105.5
        },
        "suggestion": "Adjust percentages to sum to 100% or less for third-party ownership"
      }
    ]
  }
}
```

---

## Enhanced Authentication and Authorization

### JWT Token Requirements

All endpoints require valid JWT token in Authorization header:

```http
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

### Enhanced Permission Model for Phase 2

**Core Permissions**:
- `client_groups:read`: View client information and generate reports
- `client_groups:write`: Create and edit client data
- `client_groups:delete`: Delete information items and products
- `snapshots:create`: Create historical snapshots
- `reports:generate`: Generate KYC and networth reports

**Phase 2 Enhanced Permissions**:
- `sensitive_data:access`: Access encrypted security fields (three words, security notes)
- `sensitive_data:decrypt`: Decrypt sensitive fields for viewing
- `sensitive_data:modify`: Update encrypted security fields
- `bulk_operations:execute`: Perform bulk operations across client groups
- `global_actions:manage`: Create and manage cross-client actions
- `audit_logs:read`: Access audit trail and compliance reports
- `liquidity_preferences:modify`: Modify user liquidity display preferences
- `pdf_exports:generate`: Generate PDF reports and summaries
- `phone_management:advanced`: Manage phone verification and enhanced contact features

### Multi-Factor Authentication for Sensitive Operations

```http
# Enhanced authentication headers for sensitive data access
Authorization: Bearer <jwt_token>
X-Security-Clearance: sensitive_data_access
X-MFA-Token: 123456
X-Access-Reason: client_meeting_preparation
X-Session-Context: {
  "meeting_id": "meet_123_20240829",
  "client_consent": "verbal_consent_recorded",
  "business_purpose": "client_identity_verification"
}
```

### Role-Based Access Control Matrix

| Role | Client Read | Client Write | Sensitive Data | Bulk Ops | Global Actions | Audit Logs |
|------|-------------|--------------|----------------|----------|----------------|------------|
| Assistant | ✓ | Limited | ✗ | ✗ | ✗ | ✗ |
| Advisor | ✓ | ✓ | ✓ (with MFA) | Limited | ✓ | Read Only |
| Senior Advisor | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| Compliance Officer | ✓ | Limited | ✓ | ✗ | Limited | Full Access |
| System Administrator | ✓ | ✓ | ✗ | ✓ | ✓ | Full Access |

### Enhanced Client Group Access Control

Users can only access client groups where they have explicit permissions. The system performs enhanced security checks:

```python
# Enhanced permission check pattern with audit logging
async def check_enhanced_client_access(
    client_group_id: int,
    required_permission: str,
    current_user: User = Depends(get_current_user),
    request: Request = None
):
    # Standard permission check
    if not current_user.has_permission(client_group_id, required_permission):
        await log_access_denied(current_user.id, client_group_id, required_permission)
        raise HTTPException(
            status_code=403, 
            detail=f"Insufficient permissions for client group {client_group_id}"
        )
    
    # Enhanced security for sensitive operations
    if required_permission.startswith('sensitive_data:'):
        if not await verify_mfa_token(current_user, request.headers.get('X-MFA-Token')):
            raise HTTPException(
                status_code=403,
                detail="Multi-factor authentication required for sensitive data access"
            )
        
        # Log sensitive data access
        await log_sensitive_access(
            user_id=current_user.id,
            client_group_id=client_group_id,
            permission=required_permission,
            justification=request.headers.get('X-Access-Reason'),
            session_context=request.headers.get('X-Session-Context')
        )
    
    return client_group_id

# Session timeout for sensitive operations
async def enforce_sensitive_session_timeout(current_user: User):
    if current_user.has_active_sensitive_session():
        session_duration = datetime.utcnow() - current_user.sensitive_session_start
        if session_duration.total_seconds() > 3600:  # 1 hour timeout
            await revoke_sensitive_session(current_user)
            raise HTTPException(
                status_code=401,
                detail="Sensitive data session expired. Please re-authenticate."
            )
```

### API Rate Limiting by Permission Level

**Rate Limits by User Role**:
- Assistant: 30 requests/minute, no bulk operations
- Advisor: 60 requests/minute, 3 bulk operations/hour
- Senior Advisor: 100 requests/minute, 5 bulk operations/hour
- Compliance Officer: 200 requests/minute (audit access), no bulk operations

**Enhanced Rate Limiting for Sensitive Operations**:
- Sensitive data decryption: 10 requests/hour per user
- PDF exports: 20 exports/hour per user
- Bulk operations: Role-based limits with supervisor approval for large operations
- Global actions: 50 cross-client operations/day per user

---

## Performance Optimization

### Response Time Targets

| Operation Type | Target Response Time | Maximum Acceptable |
|---------------|---------------------|-------------------|
| List operations | <500ms | 2s |
| Item creation | <300ms | 1s |
| Search queries | <1s | 3s |
| Networth generation | <2s | 5s |
| Snapshot creation | <3s | 10s |
| KYC generation | <5s | 15s |

### Caching Strategy

**Cacheable Data**:
- Historical snapshots (immutable, cache indefinitely)
- KYC report templates (cache for 24 hours)
- Provider lists (cache for 1 hour)

**Non-Cacheable Data**:
- Current networth calculations (always dynamic)
- Information items (frequently updated)
- Search results (user-specific)

### Database Query Optimization

**Index Usage**:
- GIN indexes on all JSONB columns for fast JSON queries
- Composite indexes on frequently filtered columns
- Partial indexes for status and date filtering

**Query Patterns**:
```sql
-- Optimized information items query with JSON filtering
SELECT * FROM client_information_items 
WHERE client_group_id = $1 
  AND item_type = $2
  AND data_content @> '{"bank": "Halifax"}'
ORDER BY updated_at DESC 
LIMIT 20;

-- Uses indexes: idx_client_items_client_group, idx_client_items_content_gin
```

---

## Enhanced API Monitoring and Health Checks

### Advanced Request Monitoring

**Comprehensive Request Logging**:
- All API requests logged with correlation IDs, user context, and performance metrics
- Real-time monitoring of concurrent user limits
- Automatic alerting for system degradation
- Rate limiting enforcement and reporting

**Enhanced Health Check Endpoints**:

#### GET /health/phase2/comprehensive

```json
{
  "status": "healthy",
  "correlation_id": "health_20240827_103045_h1i2j3k4",
  "timestamp": "2024-08-27T10:30:45Z",
  "checks": {
    "database_connectivity": "ok",
    "json_validation": "ok", 
    "search_indexes": "ok",
    "rate_limiting_service": "ok",
    "websocket_connections": "ok",
    "correlation_id_generation": "ok"
  },
  "performance": {
    "avg_response_time_ms": 145,
    "p95_response_time_ms": 420,
    "active_connections": 3,
    "concurrent_users": 2,
    "rate_limit_violations_last_hour": 5
  },
  "system_limits": {
    "max_concurrent_users": 4,
    "current_concurrent_users": 2,
    "approaching_limits": false
  },
  "error_rates": {
    "last_hour": {
      "4xx_errors": 12,
      "5xx_errors": 1,
      "rate_limit_errors": 5
    },
    "error_rate_percentage": 2.3
  }
}
```

#### GET /health/phase2/realtime-status

```json
{
  "realtime_services": {
    "websocket_connections": {
      "active_connections": 8,
      "connections_by_client_group": {
        "123": 3,
        "124": 2,
        "125": 3
      }
    },
    "sse_connections": {
      "active_streams": 2
    },
    "message_queue": {
      "pending_messages": 0,
      "processed_last_minute": 45
    }
  },
  "concurrent_user_tracking": {
    "client_group_123": {
      "active_users": 2,
      "user_details": [
        {"user_id": 101, "connected_at": "2024-08-27T10:25:00Z", "last_activity": "2024-08-27T10:30:00Z"},
        {"user_id": 102, "connected_at": "2024-08-27T10:28:00Z", "last_activity": "2024-08-27T10:29:00Z"}
      ]
    }
  }
}
```

### Performance Alerting Thresholds

**System Alert Levels**:
1. **Green** (Normal): <3 concurrent users, <500ms avg response time
2. **Yellow** (Warning): 3 concurrent users, 500ms-1s response time  
3. **Orange** (Caution): 4 concurrent users, 1s-2s response time
4. **Red** (Critical): >4 users attempted, >2s response time

**Automated Alerts**:
```python
# Alert configuration
ALERT_THRESHOLDS = {
    "concurrent_users_warning": 3,
    "concurrent_users_critical": 4,
    "response_time_warning_ms": 1000,
    "response_time_critical_ms": 2000,
    "error_rate_warning_percent": 5.0,
    "error_rate_critical_percent": 10.0,
    "rate_limit_violations_per_hour": 20
}
```

---

## Integration with Existing System

### Compatibility with Current APIs

**Seamless Integration**:
- All new endpoints follow existing FastAPI patterns
- Same authentication mechanism and JWT token format
- Consistent error response formats
- No changes to existing endpoint behavior

**Data Synchronization**:
- Managed product valuations sync with existing portfolio system
- Product owner data remains consistent across old and new systems
- No duplicate data storage - references existing entities

### Migration Considerations

**API Version Management**:
- Phase 2 endpoints versioned as v2 where appropriate
- Existing v1 endpoints unchanged and fully functional
- Progressive enhancement approach for UI integration

**Deployment Strategy**:
- New endpoints deployed alongside existing system
- Feature flags control access to new functionality
- Rollback capability maintains existing API functionality

---

## Client Objectives and Actions Management

### GET /api/client_groups/{client_group_id}/objectives

**Purpose**: Retrieve all objectives for a specific client group (completely independent from actions)

#### Response Format
```json
{
  "objectives": [
    {
      "id": 1,
      "client_group_id": 123,
      "title": "Retirement Planning",
      "description": "Build a comprehensive retirement portfolio targeting £750,000 by age 65. Focus on maximizing pension contributions and ISA allowances while maintaining appropriate risk levels for long-term growth.",
      "priority": "high",
      "start_date": "2024-01-15",
      "target_date": "2030-12-31",
      "last_discussed": "2024-08-29",
      "status": "on-target",
      "created_at": "2024-08-26T10:00:00Z",
      "updated_at": "2024-08-26T10:00:00Z"
    }
  ],
  "total_count": 3,
  "performance": {
    "query_time_ms": 45
  }
}
```

### POST /api/client_groups/{client_group_id}/objectives

**Purpose**: Create a new client objective (independent entity)

#### Request Format
```json
{
  "title": "House Purchase",
  "description": "Save for deposit on family home in Surrey area. Target property value £450,000 requiring £90,000 deposit plus stamp duty and legal costs. Maintain funds in accessible investments.",
  "priority": "medium",
  "start_date": "2024-08-01",
  "target_date": "2026-06-30",
  "last_discussed": "2024-08-29",
  "status": "planning"
}
```

### PUT /api/client_groups/{client_group_id}/objectives/{objective_id}

**Purpose**: Update existing objective with enhanced description, priority tracking, and date field management

#### Request Format
```json
{
  "title": "Updated Retirement Planning",
  "description": "Enhanced retirement portfolio strategy targeting £800,000 by age 65, with increased focus on ESG investments and tax-efficient pension contributions.",
  "priority": "high",
  "start_date": "2024-01-15",
  "target_date": "2030-12-31",
  "last_discussed": "2024-08-29",
  "status": "on-target"
}
```

#### Enhanced Features
- **Date Field Validation**: Ensures logical date relationships (start_date ≤ target_date)
- **Last Discussed Tracking**: Automatic updates when objective is modified during client meetings
- **Status Change Logging**: Audit trail for status changes with timestamps and user attribution
- **Complete Independence**: No action-related functionality or references

### GET /api/client_groups/{client_group_id}/actions

**Purpose**: Retrieve all action items for a specific client group (completely independent from objectives)

#### Query Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| status | string | No | Filter by action status (todo, completed) |
| assignment_type | string | No | Filter by assignment type (advisor, client, other) |
| date_range | string | No | Filter by date range (created, target, drop_dead) |

#### Enhanced Response Format
```json
{
  "actions": [
    {
      "id": 1,
      "client_group_id": 123,
      "title": "Review pension contributions",
      "description": "Analyze current pension contributions across all schemes including workplace pension and SIPP. Consider increasing contributions to maximize annual allowance and tax efficiency. Review provider performance and fees.",
      "date_created": "2024-08-15",
      "target_date": "2024-09-15",
      "drop_dead_date": "2024-09-20",
      "date_completed": null,
      "assigned_to": "John Advisor",
      "assignment_type": "advisor",
      "status": "todo",
      "client_group_name": "Smith Family Trust",
      "created_at": "2024-08-26T10:00:00Z",
      "updated_at": "2024-08-26T10:00:00Z"
    },
    {
      "id": 2,
      "client_group_id": 123,
      "title": "Update client contact details",
      "description": "Verify and update client email and phone information following recent move.",
      "date_created": "2024-08-20",
      "target_date": "2024-09-10",
      "drop_dead_date": "2024-09-15",
      "date_completed": "2024-08-25",
      "assigned_to": "Jane Advisor",
      "assignment_type": "advisor", 
      "status": "completed",
      "client_group_name": "Smith Family Trust",
      "created_at": "2024-08-26T11:00:00Z",
      "updated_at": "2024-08-25T14:30:00Z"
    }
  ],
  "summary": {
    "total_count": 8,
    "by_status": {
      "todo": 5,
      "completed": 3
    },
    "by_assignment_type": {
      "advisor": 4,
      "client": 3,
      "other": 1
    }
  },
  "performance": {
    "query_time_ms": 42
  }
}
```

### GET /api/actions/global

**Purpose**: Retrieve actions from ALL client groups for global cross-client management (no objective context)

#### Query Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| client_group_ids | array | No | Filter by specific client groups |
| status | string | No | Filter by action status (todo, completed) |
| assignment_type | string | No | Filter by assignment type (advisor, client, other) |
| due_date_range | string | No | Filter by target/drop dead date ranges |
| overdue_only | boolean | No | Show only overdue actions |

### POST /api/client_groups/{client_group_id}/actions

**Purpose**: Create a new standalone action item (no objective linking)

#### Request Format
```json
{
  "title": "Provide salary documentation",
  "description": "Gather and provide recent P60s, last 3 months payslips, and employment contract. Client to collect these documents from HR department and scan for secure upload.",
  "date_created": "2024-08-20",
  "target_date": "2024-09-20",
  "drop_dead_date": "2024-09-25", 
  "assigned_to": "John Smith (Client)",
  "assignment_type": "client",
  "status": "todo"
}
```

#### Enhanced Validation Rules
- **Date Logic Validation**: date_created ≤ target_date ≤ drop_dead_date
- **Assignment Validation**: assigned_to must be valid user or client name depending on assignment_type
- **No Objective References**: All objective_id fields and validations completely removed

### PUT /api/client_groups/{client_group_id}/actions/{action_id}

**Purpose**: Update existing standalone action item (no objective linking)

#### Request Format
```json
{
  "title": "Updated: Complete risk assessment questionnaire",
  "description": "Fill out comprehensive attitude to risk questionnaire online, including capacity for loss assessment and investment experience details. Updated with new regulatory requirements.",
  "target_date": "2024-09-25",
  "drop_dead_date": "2024-09-30",
  "date_completed": "2024-08-29",
  "status": "completed"
}
```

#### Enhanced Features
- **Date Completed Tracking**: New field for tracking completion dates
- **Status Management**: Two-status system (todo/completed) with completion date validation
- **Complete Independence**: No objective-related functionality or references

### POST /api/actions/export/pdf

**Purpose**: Export selected actions to PDF format (no objective context)

#### Request Format
```json
{
  "action_ids": [1, 2, 5, 8],
  "export_options": {
    "include_completed": true,
    "sort_by": "target_date",
    "group_by_client": true,
    "date_range": {
      "start": "2024-08-01",
      "end": "2024-12-31"
    }
  }
}
```

---

## Global Actions API

### GET /api/actions/global/cross_client

**Purpose**: Advanced cross-client action management for wealth advisors managing multiple client groups
**Authentication**: Required
**Method**: GET

#### Enhanced Query Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| client_group_ids | array | No | Specific client groups to include (default: all accessible) |
| status_filter | string | No | Filter by status (overdue, due_today, due_this_week, completed_recently) |
| assignment_filter | string | No | Filter by assignment (my_actions, client_actions, other_advisor_actions) |
| priority_filter | string | No | Filter by priority (high, medium, low) |
| search_query | string | No | Search across action titles and descriptions |
| sort_by | string | No | Sort field (target_date, priority, client_name, created_date) |
| sort_order | string | No | Sort direction (asc, desc, default: asc) |
| include_completed | boolean | No | Include completed actions (default: false) |
| date_range | object | No | Date range filter for target/drop dead dates |

#### Advanced Response Format with Cross-Client Insights

```json
{
  "global_actions": {
    "summary": {
      "total_actions": 45,
      "overdue_actions": 8,
      "due_today": 12,
      "due_this_week": 15,
      "completed_this_week": 22,
      "by_client_group": {
        "123": {"total": 12, "overdue": 2, "client_name": "Smith Family Trust"},
        "124": {"total": 18, "overdue": 3, "client_name": "Johnson Portfolio"},
        "125": {"total": 15, "overdue": 3, "client_name": "Williams Estate"}
      },
      "by_assignment_type": {
        "advisor": 28,
        "client": 15,
        "other": 2
      },
      "performance_metrics": {
        "avg_completion_time_days": 5.2,
        "overdue_rate_percent": 17.8,
        "client_responsiveness_score": 8.2
      }
    },
    "actions": [
      {
        "id": 789,
        "client_group_id": 123,
        "client_group_name": "Smith Family Trust",
        "title": "Review pension contributions",
        "description": "Analyze current pension contributions across all schemes including workplace pension and SIPP",
        "target_date": "2024-09-15",
        "drop_dead_date": "2024-09-20",
        "days_until_target": 3,
        "days_until_drop_dead": 8,
        "status": "todo",
        "priority": "high",
        "assigned_to": "John Advisor",
        "assignment_type": "advisor",
        "created_at": "2024-08-15T10:00:00Z",
        "last_contacted_client": "2024-08-28T14:30:00Z",
        "estimated_effort_hours": 2.5,
        "dependencies": [
          {
            "action_id": 790,
            "dependency_type": "blocks",
            "description": "Waiting for client to provide salary information"
          }
        ],
        "client_context": {
          "risk_profile": "moderate",
          "last_meeting_date": "2024-08-20",
          "next_meeting_date": "2024-09-25",
          "communication_preference": "email"
        }
      }
    ]
  },
  "workflow_insights": {
    "bottlenecks": [
      {
        "type": "client_dependency",
        "affected_actions": 8,
        "avg_delay_days": 3.2,
        "recommendation": "Follow up with automated email reminders"
      }
    ],
    "efficiency_opportunities": [
      {
        "type": "batch_processing",
        "potential_actions": 5,
        "estimated_time_saved_hours": 2.5,
        "description": "Similar documentation reviews can be batched"
      }
    ]
  },
  "pagination": {
    "total": 45,
    "limit": 25,
    "offset": 0,
    "pages": 2
  }
}
```

### POST /api/actions/global/bulk_create

**Purpose**: Create multiple actions across different client groups in single operation
**Authentication**: Required
**Method**: POST
**Rate Limit**: 3 operations/hour

#### Request Body Schema

```json
{
  "bulk_actions": [
    {
      "client_group_id": 123,
      "title": "Annual ISA review",
      "description": "Review ISA performance and consider rebalancing for tax year 2024-25",
      "target_date": "2024-09-30",
      "drop_dead_date": "2024-10-05",
      "assigned_to": "John Advisor",
      "assignment_type": "advisor",
      "priority": "medium",
      "estimated_effort_hours": 1.5,
      "template_id": "annual_isa_review"
    },
    {
      "client_group_id": 124,
      "title": "Annual ISA review", 
      "description": "Review ISA performance and consider rebalancing for tax year 2024-25",
      "target_date": "2024-10-02",
      "drop_dead_date": "2024-10-07",
      "assigned_to": "John Advisor",
      "assignment_type": "advisor",
      "priority": "medium",
      "estimated_effort_hours": 1.5,
      "template_id": "annual_isa_review"
    }
  ],
  "bulk_options": {
    "apply_template_customization": true,
    "auto_schedule_based_on_workload": true,
    "send_creation_notifications": true,
    "group_related_actions": true
  }
}
```

### PUT /api/actions/global/{action_id}/complete

**Purpose**: Mark action as complete with comprehensive tracking
**Authentication**: Required
**Method**: PUT

#### Request Body Schema

```json
{
  "completion_details": {
    "completed_at": "2024-08-29T15:30:00Z",
    "completion_notes": "Successfully reviewed all pension contributions. Client agreed to increase SIPP contributions by £200/month.",
    "actual_effort_hours": 2.0,
    "outcome_rating": "successful",
    "follow_up_required": true,
    "follow_up_actions": [
      {
        "title": "Process SIPP contribution increase",
        "target_date": "2024-09-05",
        "priority": "high"
      }
    ],
    "client_satisfaction_score": 9,
    "documentation_links": [
      "pension_review_summary_20240829.pdf",
      "contribution_change_form_20240829.pdf"
    ]
  }
}
```

---

## Phone Management API

### GET /api/product_owners/{product_owner_id}/phone_numbers

**Purpose**: Retrieve all phone numbers for a product owner with flexible multi-type system support
**Authentication**: Required
**Method**: GET

#### Response Format

```json
{
  "phone_numbers": [
    {
      "id": 1,
      "product_owner_id": 123,
      "phone_type": "mobile",
      "phone_number": "07700 900123",
      "is_primary": true,
      "is_verified": true,
      "country_code": "+44",
      "formatted_display": "+44 7700 900123",
      "best_time_to_call": "09:00-17:00",
      "notes": "Work mobile, always available",
      "created_at": "2024-01-15T10:00:00Z",
      "updated_at": "2024-08-29T14:30:00Z",
      "last_verified": "2024-08-15T09:00:00Z"
    },
    {
      "id": 2,
      "product_owner_id": 123,
      "phone_type": "house_phone",
      "phone_number": "01234 567890",
      "is_primary": false,
      "is_verified": false,
      "country_code": "+44",
      "formatted_display": "+44 1234 567890",
      "best_time_to_call": "18:00-21:00",
      "notes": "Home landline, evenings only",
      "created_at": "2024-01-20T11:00:00Z",
      "updated_at": "2024-08-29T14:30:00Z",
      "last_verified": null
    },
    {
      "id": 3,
      "product_owner_id": 123,
      "phone_type": "work",
      "phone_number": "0161 123 4567",
      "is_primary": false,
      "is_verified": true,
      "country_code": "+44",
      "formatted_display": "+44 161 123 4567",
      "best_time_to_call": "09:00-17:00",
      "notes": "Office direct line",
      "created_at": "2024-02-01T09:00:00Z",
      "updated_at": "2024-08-29T14:30:00Z",
      "last_verified": "2024-08-20T10:30:00Z"
    },
    {
      "id": 4,
      "product_owner_id": 123,
      "phone_type": "other",
      "phone_number": "07800 654321",
      "is_primary": false,
      "is_verified": false,
      "country_code": "+44",
      "formatted_display": "+44 7800 654321",
      "best_time_to_call": "any",
      "notes": "Partner's mobile for emergencies",
      "created_at": "2024-03-10T14:00:00Z",
      "updated_at": "2024-08-29T14:30:00Z",
      "last_verified": null
    }
  ],
  "summary": {
    "total_numbers": 4,
    "verified_numbers": 2,
    "primary_number": {
      "id": 1,
      "phone_type": "mobile",
      "formatted_display": "+44 7700 900123"
    },
    "preferred_contact_method": "mobile"
  }
}
```

### POST /api/product_owners/{product_owner_id}/phone_numbers

**Purpose**: Add new phone number with enhanced validation and formatting
**Authentication**: Required
**Method**: POST

#### Request Body Schema

```json
{
  "phone_type": "other",
  "phone_number": "07900 111222",
  "is_primary": false,
  "country_code": "+44",
  "best_time_to_call": "weekends",
  "notes": "Secondary mobile for weekends",
  "require_verification": true
}
```

#### Enhanced Phone Type Support

**Supported Phone Types**:
- `mobile` - Primary mobile phone (most common)
- `house_phone` - Home landline
- `work` - Work/office phone
- `other` - Any other phone type (partner, emergency contact, etc.)

#### Advanced Validation Rules

```typescript
interface PhoneValidation {
  phoneNumberFormat: 'UK format required (e.g., 07700 900123, 0161 123 4567)';
  maxPhoneNumbers: 6; // Increased from 5 to support flexible system
  primaryPhoneLogic: 'Only one primary phone allowed across all types';
  duplicateValidation: 'Same number cannot be added multiple times';
  internationalSupport: 'UK (+44) numbers only in Phase 2';
  verificationRequired: 'Primary phones must be verified within 7 days';
}
```

### PUT /api/product_owners/{product_owner_id}/phone_numbers/{phone_id}

**Purpose**: Update phone number with verification status and enhanced metadata
**Authentication**: Required
**Method**: PUT

#### Request Body Schema

```json
{
  "phone_type": "mobile",
  "phone_number": "07700 900124",
  "is_primary": true,
  "best_time_to_call": "09:00-18:00",
  "notes": "Updated mobile number - verified via SMS",
  "is_verified": true,
  "last_verified": "2024-08-29T15:30:00Z"
}
```

#### Business Logic Updates

**Primary Phone Management**:
- When setting a phone as primary, automatically removes primary status from other phones
- Primary phone must be verified within 7 days or warning alerts are generated
- If primary phone is deleted, system automatically promotes the most recently verified phone

**Verification System**:
- New phones can be marked for verification during creation
- Verification status tracked with timestamps
- Unverified phones older than 30 days trigger cleanup notifications

### POST /api/product_owners/{product_owner_id}/phone_numbers/{phone_id}/verify

**Purpose**: Initiate phone number verification process
**Authentication**: Required
**Method**: POST

#### Request Body Schema

```json
{
  "verification_method": "sms",
  "send_verification_code": true,
  "notes": "Client requested verification during meeting"
}
```

#### Response Format

```json
{
  "verification": {
    "phone_id": 3,
    "verification_id": "verify_phone_123_20240829_153045",
    "method": "sms",
    "code_sent": true,
    "code_expires_at": "2024-08-29T16:00:00Z",
    "verification_status": "pending",
    "max_attempts": 3,
    "attempts_remaining": 3
  }
}
```

---

## Liquidity Preferences API

### GET /api/users/{user_id}/liquidity_preferences

**Purpose**: Retrieve user's asset liquidity ordering preferences for customized display
**Authentication**: Required
**Method**: GET

#### Response Format

```json
{
  "liquidity_preferences": {
    "user_id": 101,
    "preference_profile": "conservative_wealth_management",
    "custom_ordering": {
      "cash_equivalents": {
        "display_order": 1,
        "subcategory_order": ["bank_accounts", "cash_isas", "premium_bonds"],
        "sort_within_category": "liquidity_desc"
      },
      "accessible_investments": {
        "display_order": 2,
        "subcategory_order": ["stocks_shares_isas", "gias", "unit_trusts"],
        "sort_within_category": "value_desc"
      },
      "retirement_investments": {
        "display_order": 3,
        "subcategory_order": ["sipps", "workplace_pensions", "final_salary_schemes"],
        "sort_within_category": "maturity_date_asc"
      },
      "illiquid_investments": {
        "display_order": 4,
        "subcategory_order": ["property", "private_equity", "venture_capital"],
        "sort_within_category": "value_desc"
      },
      "personal_assets": {
        "display_order": 5,
        "subcategory_order": ["primary_residence", "vehicles", "collectibles"],
        "sort_within_category": "category_alpha"
      },
      "liabilities": {
        "display_order": 6,
        "subcategory_order": ["mortgages", "loans", "credit_cards"],
        "sort_within_category": "amount_desc"
      }
    },
    "display_preferences": {
      "show_zero_values": false,
      "highlight_managed_products": true,
      "group_joint_ownership": true,
      "show_percentage_ownership": true,
      "currency_display": "GBP",
      "decimal_places": 0,
      "use_color_coding": true,
      "show_last_valuation_date": true
    },
    "user_customizations": {
      "favorite_categories": ["cash_equivalents", "accessible_investments"],
      "hidden_categories": [],
      "custom_category_names": {
        "gias": "General Investment Accounts",
        "sipps": "Self-Invested Personal Pensions"
      }
    },
    "created_at": "2024-01-15T10:00:00Z",
    "updated_at": "2024-08-29T14:30:00Z"
  },
  "available_profiles": [
    {
      "profile_id": "conservative_wealth_management",
      "profile_name": "Conservative Wealth Management",
      "description": "Prioritizes liquidity and capital preservation",
      "is_default": true
    },
    {
      "profile_id": "growth_focused",
      "profile_name": "Growth Focused",
      "description": "Emphasizes investment growth over liquidity",
      "is_default": false
    },
    {
      "profile_id": "retirement_planning",
      "profile_name": "Retirement Planning",
      "description": "Optimized for retirement and pension planning",
      "is_default": false
    }
  ]
}
```

### PUT /api/users/{user_id}/liquidity_preferences

**Purpose**: Update user's liquidity ordering preferences with validation
**Authentication**: Required
**Method**: PUT

#### Request Body Schema

```json
{
  "preference_profile": "conservative_wealth_management",
  "custom_ordering": {
    "cash_equivalents": {
      "display_order": 1,
      "subcategory_order": ["cash_isas", "bank_accounts", "premium_bonds"],
      "sort_within_category": "value_desc"
    },
    "accessible_investments": {
      "display_order": 2,
      "subcategory_order": ["gias", "stocks_shares_isas", "unit_trusts"],
      "sort_within_category": "performance_desc"
    }
  },
  "display_preferences": {
    "show_zero_values": true,
    "highlight_managed_products": true,
    "decimal_places": 2,
    "use_color_coding": false
  },
  "user_customizations": {
    "favorite_categories": ["cash_equivalents"],
    "custom_category_names": {
      "gias": "Investment Accounts"
    }
  }
}
```

#### Validation Rules

**Ordering Validation**:
- All major categories must have unique display_order values (1-6)
- Subcategory_order arrays must contain all available subcategories for that category
- Sort_within_category must be valid sort method for category type

**Business Logic**:
- Changes apply immediately to all net worth and report displays
- Invalid ordering falls back to system default with user notification
- Preferences are user-specific and don't affect other advisors' views

### POST /api/users/{user_id}/liquidity_preferences/reset_to_default

**Purpose**: Reset user preferences to system default profile
**Authentication**: Required
**Method**: POST

#### Request Body Schema

```json
{
  "target_profile": "conservative_wealth_management",
  "preserve_custom_names": true,
  "preserve_display_preferences": false
}
```

---

## PDF Export API

### POST /api/client_groups/{client_group_id}/pdf_exports/global_actions_summary

**Purpose**: Generate PDF export of global actions with cross-client summary
**Authentication**: Required
**Method**: POST
**Rate Limit**: 10 exports/hour per user

#### Request Body Schema

```json
{
  "export_options": {
    "action_filters": {
      "client_group_ids": [123, 124, 125],
      "status_filter": "active_and_overdue",
      "date_range": {
        "start_date": "2024-08-01",
        "end_date": "2024-12-31"
      },
      "assignment_types": ["advisor", "client"],
      "include_completed_recent": true,
      "completed_since": "2024-08-15"
    },
    "export_format": {
      "grouping": "by_client_then_priority",
      "include_summary_page": true,
      "include_individual_client_sections": true,
      "show_performance_metrics": true,
      "include_workflow_insights": true
    },
    "branding": {
      "company_logo": true,
      "company_name": "Kingstons Wealth Management",
      "advisor_name": "John Advisor",
      "report_title": "Multi-Client Action Summary - August 2024",
      "confidentiality_footer": true
    },
    "output_preferences": {
      "page_orientation": "portrait",
      "font_size": "standard",
      "color_scheme": "professional_blue",
      "include_charts": true,
      "watermark": "confidential"
    }
  }
}
```

#### Response Format

```json
{
  "pdf_export": {
    "export_id": "pdf_actions_global_20240829_153045",
    "status": "completed",
    "generated_at": "2024-08-29T15:30:45Z",
    "processing_time_seconds": 12.5,
    "file_info": {
      "filename": "Global_Actions_Summary_20240829.pdf",
      "file_size_bytes": 2456789,
      "page_count": 8,
      "sections_included": [
        "Executive Summary",
        "Smith Family Trust Actions", 
        "Johnson Portfolio Actions",
        "Williams Estate Actions",
        "Performance Analytics",
        "Workflow Recommendations"
      ]
    },
    "download_info": {
      "download_url": "/api/pdf_exports/download/pdf_actions_global_20240829_153045.pdf",
      "expires_at": "2024-08-30T15:30:45Z",
      "access_token": "pdf_access_token_a1b2c3d4e5f6"
    },
    "content_summary": {
      "total_actions_included": 45,
      "clients_covered": 3,
      "overdue_actions_highlighted": 8,
      "completion_rate_shown": "82.3%",
      "key_insights": [
        "Client response rate improved by 15% this month",
        "Documentation reviews can be batched for efficiency",
        "3 clients approaching annual review dates"
      ]
    }
  },
  "export_analytics": {
    "data_sources_accessed": ["actions", "client_groups", "user_preferences"],
    "database_query_time_ms": 450,
    "pdf_generation_time_ms": 8200,
    "memory_usage_mb": 15.2,
    "cache_performance": {"hits": 5, "misses": 2}
  }
}
```

### POST /api/client_groups/{client_group_id}/pdf_exports/client_summary

**Purpose**: Generate comprehensive client summary PDF with net worth, actions, and key information
**Authentication**: Required
**Method**: POST

#### Request Body Schema

```json
{
  "export_options": {
    "sections_to_include": {
      "executive_summary": true,
      "client_contact_details": true,
      "net_worth_statement": true,
      "managed_products_summary": true,
      "unmanaged_products_summary": true,
      "outstanding_actions": true,
      "recent_objectives_progress": true,
      "meeting_history": true,
      "compliance_status": true
    },
    "net_worth_options": {
      "apply_user_liquidity_preferences": true,
      "include_ownership_breakdown": true,
      "show_performance_charts": true,
      "compare_to_snapshot": {
        "snapshot_id": 789,
        "show_change_analysis": true
      }
    },
    "branding": {
      "client_facing": true,
      "professional_presentation": true,
      "include_advisor_contact": true,
      "confidentiality_level": "client_confidential"
    },
    "customization": {
      "report_date": "2024-08-29",
      "custom_title": "Quarterly Wealth Review - Q3 2024",
      "advisor_notes": "Prepared for quarterly review meeting scheduled for September 5th, 2024",
      "include_next_steps": true
    }
  }
}
```

#### Advanced PDF Features

**Professional Formatting**:
- Consistent with wealth management industry standards
- Automated table of contents with page references
- Professional color scheme with company branding
- Chart integration for performance visualization
- Watermark and confidentiality markings

**Content Intelligence**:
- Automated executive summary generation based on key metrics
- Intelligent highlighting of important changes and trends
- Contextual insights based on client's financial position
- Risk-appropriate language and recommendations

### GET /api/pdf_exports/{export_id}/status

**Purpose**: Check status of PDF generation process
**Authentication**: Required
**Method**: GET

#### Response Format

```json
{
  "export_status": {
    "export_id": "pdf_client_summary_123_20240829_153045",
    "status": "processing",
    "progress_percentage": 65,
    "current_stage": "generating_net_worth_charts",
    "estimated_completion_seconds": 15,
    "stages_completed": [
      {"stage": "data_collection", "completed_at": "2024-08-29T15:30:50Z"},
      {"stage": "content_generation", "completed_at": "2024-08-29T15:31:25Z"},
      {"stage": "chart_creation", "completed_at": "2024-08-29T15:31:45Z"}
    ],
    "current_stage_info": {
      "stage": "pdf_assembly",
      "description": "Assembling final PDF document with all sections",
      "progress": "75%"
    }
  },
  "performance_tracking": {
    "started_at": "2024-08-29T15:30:45Z",
    "elapsed_seconds": 25,
    "data_processing_time": 8.5,
    "chart_generation_time": 12.2,
    "estimated_total_time": 35
  }
}
```

---

## Net Worth API

### GET /api/client_groups/{client_group_id}/networth/liquidity_ordered

**Purpose**: Enhanced net worth display with user-customized liquidity-based ordering
**Authentication**: Required
**Method**: GET

#### Query Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| apply_user_preferences | boolean | No | Apply current user's liquidity preferences (default: true) |
| preference_profile | string | No | Override with specific profile (conservative_wealth_management, growth_focused, retirement_planning) |
| include_performance_metrics | boolean | No | Include asset performance data (default: false) |
| compare_to_snapshot | integer | No | Compare current values to specific snapshot ID |
| group_by_owner | boolean | No | Group assets by product owner (default: false) |
| show_percentage_ownership | boolean | No | Display ownership percentages (default: true) |

#### Enhanced Response Format

```json
{
  "networth_data": {
    "client_info": {
      "client_group_id": 123,
      "client_group_name": "Smith Family Trust",
      "product_owners": [
        {
          "id": 456,
          "known_as": "John",
          "full_name": "John Michael Smith",
          "ownership_summary": {
            "total_individual_assets": 187500.00,
            "total_joint_assets": 45000.00,
            "total_net_worth": 232500.00
          }
        },
        {
          "id": 789,
          "known_as": "Mary",
          "full_name": "Mary Elizabeth Smith",
          "ownership_summary": {
            "total_individual_assets": 156750.00,
            "total_joint_assets": 45000.00,
            "total_net_worth": 201750.00
          }
        }
      ],
      "generation_timestamp": "2024-08-29T15:30:45Z",
      "user_preferences_applied": {
        "preference_profile": "conservative_wealth_management",
        "liquidity_ordering": true,
        "custom_category_names": true
      }
    },
    "asset_categories": [
      {
        "category_id": "cash_equivalents",
        "category_display_name": "Cash & Cash Equivalents",
        "liquidity_rank": 1,
        "subcategories": [
          {
            "subcategory_id": "cash_isas",
            "subcategory_name": "Cash ISAs",
            "display_order": 1,
            "items": [
              {
                "item_id": "info_456",
                "item_type": "information_item",
                "name": "Halifax Cash ISA 2024",
                "provider": "Halifax",
                "is_managed": false,
                "ownership_breakdown": {
                  "john": 20000.00,
                  "mary": 20000.00,
                  "joint": 0.00,
                  "total": 40000.00
                },
                "liquidity_score": 9.8,
                "last_valuation_date": "2024-08-26",
                "performance_data": {
                  "annual_interest_rate": 4.25,
                  "interest_earned_ytd": 1275.50,
                  "days_to_access": 0
                },
                "notes": "Maximum ISA allowance utilized for both clients"
              }
            ],
            "subcategory_total": {
              "john": 20000.00,
              "mary": 20000.00,
              "joint": 0.00,
              "total": 40000.00
            }
          },
          {
            "subcategory_id": "bank_accounts",
            "subcategory_name": "Bank Accounts",
            "display_order": 2,
            "items": [
              {
                "item_id": "info_457",
                "item_type": "information_item", 
                "name": "Barclays Joint Current Account",
                "provider": "Barclays",
                "is_managed": false,
                "ownership_breakdown": {
                  "john": 0.00,
                  "mary": 0.00,
                  "joint": 8500.00,
                  "total": 8500.00
                },
                "liquidity_score": 10.0,
                "last_valuation_date": "2024-08-29",
                "performance_data": {
                  "annual_interest_rate": 0.25,
                  "interest_earned_ytd": 15.25,
                  "days_to_access": 0
                },
                "notes": "Primary transaction account"
              }
            ],
            "subcategory_total": {
              "john": 0.00,
              "mary": 0.00,
              "joint": 8500.00,
              "total": 8500.00
            }
          }
        ],
        "category_total": {
          "john": 20000.00,
          "mary": 20000.00,
          "joint": 8500.00,
          "total": 48500.00
        },
        "category_insights": {
          "liquidity_assessment": "Excellent - all funds accessible within 24 hours",
          "optimization_opportunities": [
            "Consider premium savings accounts for higher returns on excess cash"
          ],
          "risk_level": "Very Low",
          "recommended_allocation": "15-25% of total portfolio"
        }
      }
    ],
    "portfolio_summary": {
      "total_assets": 485000.00,
      "total_liabilities": 125000.00,
      "net_worth": 360000.00,
      "liquidity_analysis": {
        "highly_liquid_assets": 48500.00,
        "moderately_liquid_assets": 285000.00,
        "illiquid_assets": 151500.00,
        "liquidity_ratio": "33.8%",
        "emergency_fund_months": 8.5
      },
      "performance_summary": {
        "total_return_ytd": 7.8,
        "total_return_annualized": 6.2,
        "benchmark_comparison": "+1.4%",
        "risk_adjusted_return": 8.9
      },
      "change_analysis": {
        "period": "3_months",
        "net_worth_change": 15750.00,
        "percentage_change": 4.6,
        "key_drivers": [
          {"factor": "Investment growth", "contribution": 12500.00},
          {"factor": "New savings", "contribution": 5000.00},
          {"factor": "Market volatility", "contribution": -1750.00}
        ]
      }
    },
    "recommendations": {
      "asset_allocation": [
        {
          "category": "cash_equivalents",
          "current_percentage": 13.5,
          "recommended_range": "10-15%",
          "status": "optimal",
          "action": "maintain_current_level"
        }
      ],
      "liquidity_optimization": [
        {
          "opportunity": "High yield savings account",
          "potential_additional_income": 850.00,
          "implementation_complexity": "low"
        }
      ]
    }
  }
}
```

### POST /api/client_groups/{client_group_id}/networth/liquidity_analysis

**Purpose**: Generate detailed liquidity analysis with stress testing scenarios
**Authentication**: Required
**Method**: POST

#### Request Body Schema

```json
{
  "analysis_parameters": {
    "stress_test_scenarios": [
      {
        "scenario_name": "Market downturn",
        "market_decline_percent": 20,
        "liquidity_constraints": ["investment_markets_frozen_30_days"]
      },
      {
        "scenario_name": "Emergency expenses",
        "required_cash_amount": 25000.00,
        "timeline_days": 14
      }
    ],
    "planning_horizon_years": 5,
    "include_tax_implications": true,
    "consider_early_withdrawal_penalties": true
  }
}
```

---

## Security Field API

### GET /api/product_owners/{product_owner_id}/security_fields

**Purpose**: Retrieve encrypted security fields with appropriate access controls
**Authentication**: Required + Enhanced Security Clearance
**Method**: GET

#### Enhanced Authentication Requirements

```http
Authorization: Bearer <jwt_token>
X-Security-Clearance: sensitive_data_access
X-Access-Reason: client_meeting_preparation
X-Session-Context: {
  "meeting_id": "meet_123_20240829",
  "client_consent": "verbal_consent_recorded",
  "advisor_id": 101
}
```

#### Response Format

```json
{
  "security_fields": {
    "product_owner_id": 123,
    "encrypted_fields": {
      "three_words": {
        "field_id": "three_words_123",
        "encrypted_value": "enc_a1b2c3d4e5f6g7h8i9j0",
        "encryption_method": "AES-256-GCM",
        "access_level": "advisor_only",
        "last_accessed": "2024-08-29T15:30:45Z",
        "access_count": 12,
        "is_decrypted": false
      },
      "security_notes": {
        "field_id": "security_notes_123", 
        "encrypted_value": "enc_k1l2m3n4o5p6q7r8s9t0",
        "encryption_method": "AES-256-GCM",
        "access_level": "advisor_only",
        "last_accessed": "2024-08-28T10:15:22Z",
        "access_count": 8,
        "is_decrypted": false
      }
    },
    "access_permissions": {
      "can_decrypt": true,
      "can_modify": true,
      "requires_additional_auth": false,
      "access_window_expires": "2024-08-29T16:30:45Z"
    },
    "audit_trail": {
      "total_accesses_today": 3,
      "last_accessed_by": "John Advisor",
      "access_pattern_normal": true,
      "security_score": 9.2
    }
  }
}
```

### POST /api/product_owners/{product_owner_id}/security_fields/decrypt

**Purpose**: Decrypt specific security fields for authorized access
**Authentication**: Required + Enhanced Security + Multi-Factor
**Method**: POST

#### Request Body Schema

```json
{
  "decrypt_request": {
    "fields_to_decrypt": ["three_words", "security_notes"],
    "access_justification": "Client meeting preparation - annual review scheduled",
    "session_context": {
      "meeting_scheduled": "2024-08-30T10:00:00Z",
      "client_consent_method": "verbal_during_call",
      "business_purpose": "verify_client_identity"
    },
    "security_verification": {
      "advisor_password": "encrypted_password_hash",
      "two_factor_token": "123456",
      "biometric_verification": "fingerprint_hash_a1b2c3"
    }
  }
}
```

#### Response Format

```json
{
  "decrypted_fields": {
    "three_words": {
      "decrypted_value": ["sunset", "keyboard", "dolphin"],
      "field_metadata": {
        "last_updated": "2024-01-15T10:00:00Z",
        "updated_by": "Jane Advisor",
        "encryption_version": "v2.1"
      }
    },
    "security_notes": {
      "decrypted_value": "Client prefers morning meetings. Has hearing difficulties - speak clearly. Spouse handles joint account decisions.",
      "field_metadata": {
        "last_updated": "2024-08-15T14:30:00Z", 
        "updated_by": "John Advisor",
        "encryption_version": "v2.1"
      }
    }
  },
  "access_tracking": {
    "access_id": "access_sec_123_20240829_153045",
    "decryption_timestamp": "2024-08-29T15:30:45Z",
    "session_expires": "2024-08-29T16:30:45Z",
    "auto_encrypt_after": 3600,
    "access_logged": true,
    "compliance_verified": true
  }
}
```

### PUT /api/product_owners/{product_owner_id}/security_fields

**Purpose**: Update encrypted security fields with enhanced audit logging
**Authentication**: Required + Enhanced Security
**Method**: PUT

#### Request Body Schema

```json
{
  "field_updates": {
    "three_words": {
      "new_value": ["mountain", "piano", "adventure"],
      "update_reason": "Client requested change during annual review",
      "verification_method": "verbal_confirmation"
    },
    "security_notes": {
      "new_value": "Client relocated to Edinburgh. New contact preference: email first, then mobile. Partner now primary contact for urgent matters.",
      "update_reason": "Address and contact preference changes",
      "verification_method": "documentation_provided"
    }
  },
  "security_context": {
    "advisor_authorization": "confirmed",
    "client_consent": "written_consent_form_signed",
    "update_timestamp": "2024-08-29T15:30:45Z",
    "meeting_reference": "annual_review_20240829"
  }
}
```

#### Enhanced Security Features

**Field-Level Encryption**:
- Each field encrypted with unique keys
- AES-256-GCM encryption with authenticated encryption
- Key rotation every 90 days automatically
- Zero-knowledge architecture - even database administrators cannot decrypt

**Access Control Matrix**:
- Role-based permissions (Senior Advisor, Advisor, Assistant)
- Time-based access controls (office hours only)
- Location-based restrictions (office network required)
- Multi-factor authentication for sensitive fields

**Audit Compliance**:
- Every access logged with full context
- Retention policy: 7 years minimum
- GDPR compliance with data subject access rights
- Real-time suspicious activity monitoring

---

## Audit Log API

### GET /api/audit_logs/comprehensive

**Purpose**: Retrieve comprehensive audit trail for compliance reporting and security monitoring
**Authentication**: Required + Audit Access Permissions
**Method**: GET

#### Query Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| start_date | datetime | Yes | Start of audit period |
| end_date | datetime | Yes | End of audit period (max 90 days) |
| event_types | array | No | Filter by specific event types |
| user_ids | array | No | Filter by specific users |
| client_group_ids | array | No | Filter by specific client groups |
| severity_levels | array | No | Filter by severity (low, medium, high, critical) |
| include_system_events | boolean | No | Include automated system events |
| export_format | string | No | Output format (json, csv, pdf) |
| compliance_mode | boolean | No | Include regulatory compliance fields |

#### Enhanced Response Format

```json
{
  "audit_log": {
    "report_metadata": {
      "report_id": "audit_comprehensive_20240829_153045",
      "generated_at": "2024-08-29T15:30:45Z",
      "generated_by": {
        "user_id": 101,
        "user_name": "John Advisor",
        "role": "Senior Advisor"
      },
      "period_covered": {
        "start_date": "2024-08-01T00:00:00Z",
        "end_date": "2024-08-29T23:59:59Z",
        "total_days": 29
      },
      "filters_applied": {
        "event_types": ["data_access", "data_modification", "security_events"],
        "severity_levels": ["medium", "high", "critical"],
        "compliance_mode": true
      }
    },
    "summary_statistics": {
      "total_events": 1456,
      "events_by_type": {
        "data_access": 892,
        "data_modification": 324,
        "security_events": 45,
        "system_events": 195
      },
      "events_by_severity": {
        "low": 1250,
        "medium": 156,
        "high": 42,
        "critical": 8
      },
      "unique_users": 12,
      "unique_client_groups": 156,
      "compliance_violations": 0,
      "security_incidents": 2
    },
    "audit_events": [
      {
        "event_id": "audit_evt_20240829_153045_a1b2c3d4",
        "timestamp": "2024-08-29T14:25:30Z",
        "event_type": "sensitive_data_access",
        "event_category": "security",
        "severity": "high",
        "user_context": {
          "user_id": 101,
          "user_name": "John Advisor",
          "role": "Senior Advisor",
          "session_id": "sess_20240829_142000",
          "ip_address": "192.168.1.45",
          "user_agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)"
        },
        "client_context": {
          "client_group_id": 123,
          "client_group_name": "Smith Family Trust",
          "product_owner_id": 456,
          "product_owner_name": "John Smith"
        },
        "event_details": {
          "action": "decrypt_security_fields",
          "fields_accessed": ["three_words", "security_notes"],
          "access_method": "api_endpoint",
          "justification": "Annual review meeting preparation",
          "multi_factor_verified": true,
          "client_consent": "verbal_consent_recorded",
          "business_purpose": "client_identity_verification"
        },
        "system_context": {
          "endpoint": "/api/product_owners/456/security_fields/decrypt",
          "response_status": 200,
          "processing_time_ms": 245,
          "database_queries": 5,
          "encryption_keys_used": ["key_v2.1_security_fields"]
        },
        "compliance_data": {
          "gdpr_lawful_basis": "legitimate_interest",
          "data_protection_impact": "minimal",
          "retention_category": "client_service_records",
          "regulatory_framework": "FCA_COBS",
          "compliance_officer_notified": false
        },
        "risk_assessment": {
          "risk_score": 6.5,
          "risk_factors": [
            "sensitive_data_access",
            "outside_normal_hours"
          ],
          "mitigation_applied": [
            "multi_factor_authentication",
            "session_timeout_enforced"
          ],
          "follow_up_required": false
        }
      },
      {
        "event_id": "audit_evt_20240829_090815_e5f6g7h8",
        "timestamp": "2024-08-29T09:08:15Z",
        "event_type": "bulk_data_modification",
        "event_category": "data_modification",
        "severity": "medium",
        "user_context": {
          "user_id": 102,
          "user_name": "Jane Advisor", 
          "role": "Advisor",
          "session_id": "sess_20240829_090500"
        },
        "client_context": {
          "client_group_id": 124,
          "client_group_name": "Johnson Portfolio"
        },
        "event_details": {
          "action": "bulk_information_items_update",
          "items_modified": 25,
          "modification_type": "valuation_updates",
          "import_source": "monthly_valuations_august_2024.xlsx",
          "validation_status": "all_passed",
          "processing_time_seconds": 12.5
        },
        "data_impact": {
          "records_affected": 25,
          "total_value_change": 15750.50,
          "categories_affected": ["GIAs", "ISAs", "Bank_Accounts"],
          "backup_created": true,
          "rollback_available": true
        },
        "system_context": {
          "endpoint": "/api/client_groups/124/bulk_import",
          "file_size_mb": 0.8,
          "memory_usage_mb": 12.3,
          "database_transactions": 1
        }
      }
    ],
    "security_incidents": [
      {
        "incident_id": "sec_incident_20240828_143022",
        "incident_type": "repeated_failed_authentication",
        "severity": "medium",
        "detected_at": "2024-08-28T14:30:22Z",
        "resolved_at": "2024-08-28T14:35:45Z",
        "affected_user": {
          "user_id": 103,
          "user_name": "Bob Assistant",
          "account_status": "temporarily_locked"
        },
        "incident_details": {
          "failed_attempts": 5,
          "time_window_minutes": 10,
          "source_ips": ["192.168.1.67", "192.168.1.68"],
          "attack_vector": "password_brute_force",
          "automated_response": "account_locked_15_minutes"
        },
        "resolution": {
          "resolution_type": "password_reset_required",
          "resolved_by": "system_administrator",
          "follow_up_actions": ["security_awareness_training_scheduled"]
        }
      }
    ],
    "compliance_summary": {
      "regulatory_requirements_met": {
        "FCA_COBS": {
          "client_data_protection": "compliant",
          "audit_trail_retention": "compliant", 
          "staff_training_records": "compliant"
        },
        "GDPR": {
          "data_processing_lawfulness": "compliant",
          "data_subject_rights": "compliant",
          "data_protection_by_design": "compliant"
        },
        "ISO_27001": {
          "access_control": "compliant",
          "information_security": "compliant",
          "incident_management": "compliant"
        }
      },
      "compliance_violations": [],
      "recommendations": [
        {
          "area": "access_patterns",
          "recommendation": "Consider implementing time-based access restrictions for sensitive data",
          "priority": "low",
          "implementation_complexity": "medium"
        }
      ]
    }
  },
  "export_options": {
    "pdf_report_available": true,
    "csv_export_available": true,
    "retention_period": "7_years",
    "archive_location": "secure_audit_storage"
  }
}
```

### POST /api/audit_logs/compliance_report

**Purpose**: Generate regulatory compliance report for specific timeframe and requirements
**Authentication**: Required + Compliance Officer Role
**Method**: POST

#### Request Body Schema

```json
{
  "compliance_report_parameters": {
    "reporting_period": {
      "start_date": "2024-Q3-start",
      "end_date": "2024-Q3-end",
      "period_type": "quarterly"
    },
    "regulatory_frameworks": [
      "FCA_COBS",
      "GDPR",
      "ISO_27001",
      "PCI_DSS"
    ],
    "report_sections": {
      "executive_summary": true,
      "detailed_event_analysis": true,
      "security_incident_summary": true,
      "compliance_violations": true,
      "remediation_actions": true,
      "risk_assessment": true
    },
    "output_format": "professional_pdf",
    "include_recommendations": true,
    "compliance_officer_review": true
  }
}
```

---

## Bulk Operations API

### POST /api/bulk_operations/cross_client_actions

**Purpose**: Execute bulk operations across multiple client groups with transaction safety
**Authentication**: Required + Bulk Operations Permission
**Method**: POST
**Rate Limit**: 2 operations/hour

#### Request Body Schema

```json
{
  "bulk_operation": {
    "operation_type": "create_recurring_actions",
    "operation_name": "Quarterly ISA Reviews - Q4 2024",
    "target_client_groups": [123, 124, 125, 126, 127],
    "operation_template": {
      "action_template": {
        "title": "Quarterly ISA Review - Q4 2024",
        "description": "Review ISA performance and allocation for Q4. Consider rebalancing opportunities and tax planning for year end.",
        "assigned_to": "John Advisor",
        "assignment_type": "advisor",
        "priority": "medium",
        "estimated_effort_hours": 1.5,
        "template_customizations": {
          "target_date_offset_days": 30,
          "drop_dead_date_offset_days": 45,
          "client_specific_notes": true
        }
      }
    },
    "execution_options": {
      "transaction_mode": "atomic_per_client",
      "rollback_on_failure": true,
      "parallel_processing": true,
      "max_concurrent_operations": 3,
      "send_notifications": true,
      "create_audit_trail": true
    },
    "validation_rules": {
      "require_client_access_permissions": true,
      "validate_advisor_workload": true,
      "check_duplicate_actions": true,
      "verify_client_group_status": "active_only"
    }
  }
}
```

#### Response Format

```json
{
  "bulk_operation_result": {
    "operation_id": "bulk_op_20240829_153045_x1y2z3a4",
    "operation_status": "completed",
    "started_at": "2024-08-29T15:30:45Z",
    "completed_at": "2024-08-29T15:32:15Z",
    "total_processing_time_seconds": 90,
    "summary": {
      "target_client_groups": 5,
      "successful_operations": 4,
      "failed_operations": 1,
      "skipped_operations": 0,
      "total_actions_created": 4
    },
    "detailed_results": [
      {
        "client_group_id": 123,
        "client_group_name": "Smith Family Trust",
        "operation_status": "success",
        "action_created": {
          "action_id": 1001,
          "title": "Quarterly ISA Review - Q4 2024",
          "target_date": "2024-09-29",
          "drop_dead_date": "2024-10-14"
        },
        "processing_time_ms": 1250,
        "customizations_applied": [
          "client_specific_isa_allocation_notes"
        ]
      },
      {
        "client_group_id": 124,
        "client_group_name": "Johnson Portfolio",
        "operation_status": "success",
        "action_created": {
          "action_id": 1002,
          "title": "Quarterly ISA Review - Q4 2024",
          "target_date": "2024-09-30",
          "drop_dead_date": "2024-10-15"
        },
        "processing_time_ms": 1180
      },
      {
        "client_group_id": 125,
        "client_group_name": "Williams Estate",
        "operation_status": "failed",
        "error_details": {
          "error_code": "INSUFFICIENT_PERMISSIONS",
          "error_message": "User does not have write access to client group 125",
          "resolution_required": "Contact administrator for permission update"
        },
        "processing_time_ms": 450
      }
    ],
    "performance_metrics": {
      "parallel_processing_efficiency": "78%",
      "database_query_count": 45,
      "memory_usage_peak_mb": 25.7,
      "cache_hit_rate": "92%"
    },
    "audit_trail": {
      "audit_record_id": "audit_bulk_20240829_153045",
      "compliance_validated": true,
      "security_review": "passed",
      "data_protection_impact": "minimal"
    }
  },
  "recommendations": [
    {
      "type": "permission_management",
      "message": "Consider reviewing bulk operation permissions for Williams Estate client group",
      "priority": "medium"
    },
    {
      "type": "workflow_optimization", 
      "message": "Enable higher parallel processing for improved performance",
      "priority": "low"
    }
  ]
}
```

### POST /api/bulk_operations/efficient_data_management

**Purpose**: Handle large-scale data operations for information-dense scenarios
**Authentication**: Required + Senior Advisor Role
**Method**: POST
**Rate Limit**: 1 operation/hour

#### Request Body Schema

```json
{
  "data_operation": {
    "operation_type": "portfolio_revaluation_update",
    "scope": {
      "client_group_ids": [123, 124, 125, 126, 127, 128, 129, 130],
      "asset_categories": ["GIAs", "ISAs", "Bank_Accounts", "Unmanaged_Products"],
      "valuation_date": "2024-08-30"
    },
    "data_source": {
      "source_type": "csv_import",
      "file_reference": "monthly_valuations_august_2024_final.csv",
      "data_validation": {
        "require_checksum_match": true,
        "validate_all_records": true,
        "allow_partial_updates": false
      }
    },
    "processing_options": {
      "batch_size": 100,
      "max_processing_time_minutes": 30,
      "memory_optimization": true,
      "create_backup_snapshot": true,
      "validate_business_rules": true
    },
    "quality_assurance": {
      "require_supervisor_approval": true,
      "supervisor_user_id": 100,
      "validation_sample_percentage": 10,
      "require_variance_analysis": true,
      "variance_threshold_percentage": 5.0
    }
  }
}
```

#### Advanced Processing Features

**Memory Optimization**:
- Stream processing for large datasets (>10MB)
- Lazy loading with pagination for reduced memory footprint
- Garbage collection optimization during batch processing
- Real-time memory usage monitoring and alerts

**Data Validation Pipeline**:
```typescript
interface DataValidationPipeline {
  structureValidation: 'CSV format, column mapping, data types';
  businessRuleValidation: 'Ownership percentages, date logic, value ranges';
  crossReferenceValidation: 'Client existence, product matching, category consistency';
  securityValidation: 'Access permissions, data sensitivity, audit requirements';
  performanceValidation: 'Processing time limits, memory constraints, batch sizes';
}
```

**Transaction Management**:
- Atomic operations at client group level
- Checkpoint creation every 50 records
- Automatic rollback on validation failures
- Progress tracking with resume capability

---

*This comprehensive API documentation provides complete specifications for all Phase 2 endpoints including the 8 major new API sections required for information-dense professional interface. For database schema details, see `10_phase2_database_schema.md`. For frontend integration patterns, see `12_phase2_frontend_architecture.md`. For testing strategies covering all these APIs, see `04_phase2_testing_specifications.md`.*