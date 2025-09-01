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

**Purpose**: Update personal details including name structure and address
**Authentication**: Required
**Method**: PUT

#### Request Body Schema

```json
{
  "title": "Mrs",
  "first_name": "Jane",
  "middle_names": "Elizabeth",
  "surname": "Smith",
  "known_as": "Jane",
  "date_of_birth": "1978-03-22",
  "ni_number": "CD987654E",
  "home_address": {
    "line_1": "456 Oak Avenue",
    "line_2": null,
    "city": "Manchester",
    "county": "Greater Manchester",
    "postal_code": "M1 1AA",
    "country": "United Kingdom"
  }
}
```

#### Validation Rules

**Name Structure Validation**:
- `title`: Required, 1-10 characters
- `first_name`: Required, 1-50 characters
- `middle_names`: Optional, max 100 characters
- `surname`: Required, 1-50 characters
- `known_as`: Required for display purposes, 1-30 characters

**Address Validation**:
- `line_1`: Required, max 100 characters
- `postal_code`: Required, UK postcode format validation
- `city`: Required, max 50 characters

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

## Client Information Items API

### GET /api/client_groups/{client_group_id}/information_items

**Purpose**: Retrieve all information items for a client group with filtering
**Authentication**: Required
**Method**: GET

#### Query Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| item_type | string | No | Filter by item type (basic_detail, income_expenditure, assets_liabilities, protection, vulnerability_health) |
| item_category | string | No | Filter by specific category |
| search | string | No | Search across item categories and JSON content |
| limit | integer | No | Pagination limit (default: 50, max: 200) |
| offset | integer | No | Pagination offset (default: 0) |
| sort_by | string | No | Sort field (updated_at, item_category, item_type) |
| sort_order | string | No | Sort direction (asc, desc, default: desc) |

#### Request Example

```http
GET /api/client_groups/123/information_items?item_type=basic_detail&search=bank&limit=20&sort_by=updated_at&sort_order=desc
Authorization: Bearer <jwt_token>
Content-Type: application/json
```

#### Response Format

```json
{
  "data": [
    {
      "id": 456,
      "client_group_id": 123,
      "item_type": "assets_liabilities",
      "item_category": "Bank Account",
      "data_content": {
        "bank": "Barclays",
        "account_type": "Current Account",
        "latest_valuation": 2500.00,
        "valuation_date": "2024-08-26",
        "associated_product_owners": {
          "association_type": "individual",
          "product_owner_id": 789
        }
      },
      "created_at": "2024-08-20T10:30:00Z",
      "updated_at": "2024-08-26T14:15:00Z",
      "last_edited_by": 101,
      "last_edited_by_name": "John Advisor"
    }
  ],
  "pagination": {
    "total": 87,
    "limit": 20,
    "offset": 0,
    "pages": 5,
    "current_page": 1
  },
  "filters_applied": {
    "item_type": "assets_liabilities",
    "search": "bank"
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
        "valuation_date": "2024-08-26"
      }
    },
    {
      "item_type": "assets_liabilities", 
      "item_category": "Savings Account",
      "data_content": {
        "bank": "Barclays",
        "account_type": "ISA",
        "latest_valuation": 15000.00,
        "valuation_date": "2024-08-26"
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

## Authentication and Authorization

### JWT Token Requirements

All endpoints require valid JWT token in Authorization header:

```http
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

### Permission Model

**Permissions Required**:
- `client_groups:read`: View client information and generate reports
- `client_groups:write`: Create and edit client data
- `client_groups:delete`: Delete information items and products
- `snapshots:create`: Create historical snapshots
- `reports:generate`: Generate KYC and networth reports

### Client Group Access Control

Users can only access client groups where they have explicit permissions. The system checks permissions on every request:

```python
# Permission check pattern (implemented in FastAPI dependencies)
async def check_client_group_access(
    client_group_id: int,
    required_permission: str,
    current_user: User = Depends(get_current_user)
):
    if not current_user.has_permission(client_group_id, required_permission):
        raise HTTPException(
            status_code=403, 
            detail=f"Insufficient permissions for client group {client_group_id}"
        )
    return client_group_id
```

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

*This API documentation provides complete specifications for all Phase 2 endpoints. For database schema details, see `10_phase2_database_schema.md`. For frontend integration patterns, see `12_phase2_frontend_architecture.md`.*