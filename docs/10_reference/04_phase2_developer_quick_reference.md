# Kingston's Portal Phase 2 Developer Quick Reference

## 🎯 Project Overview
- **Phase 2 Goal**: Add comprehensive client data management alongside existing managed products (zero breaking changes)
- **Duration**: 200 hours (5 weeks) development + 7-day deployment window with ownership model refactor
- **Architecture**: Dual-track system (existing managed products + new unmanaged products + flexible client info)

## 📊 Database Quick Reference

### New Tables
```sql
-- Core Tables
client_information_items       -- Flexible JSON client data (5 item types)
client_unmanaged_products     -- Simple products (excluded from analytics)  
client_actions               -- Task management
client_objectives           -- Goal tracking
networth_statements        -- Historical snapshots

-- Enhanced Tables  
client_products.ownership_details JSONB  -- Replaces product_owner_products
product_owners.inception_date            -- For ordering/display
```

### Key JSON Structures
```json
// Ownership Details (client_products, unmanaged_products, information_items)
{
  "association_type": "tenants_in_common",  // individual|tenants_in_common|joint_ownership
  "123": 60.00,  // product_owner_id: percentage (0.01% precision)
  "456": 40.00   // Must sum ≤100.01% (allows third-party ownership)
}

// Client Information Items (data_content)
// Two patterns based on category:

// Pattern 1: Simple array (basic_detail, income_expenditure, vulnerability_health)
{
  "product_owners": [123, 456],  // Array of product owner IDs
  "address_line_one": "123 Main St",
  "postcode": "M1 1AA"
}

// Pattern 2: Complex structure (assets_liabilities, protection)
{
  "associated_product_owners": {
    "association_type": "tenants_in_common",
    "123": 60.00,
    "456": 40.00
  },
  "latest_valuation": 25000.00,
  "valuation_date": "2024-08-26",
  "bank": "Barclays",
  "account_type": "Current Account"
}
```

### Item Types & Categories
```typescript
type ItemType = 'basic_detail' | 'income_expenditure' | 'assets_liabilities' | 'protection' | 'vulnerability_health';

// Common Categories by Type:
// basic_detail: Home Address, Employment, Personal Details
// assets_liabilities: Bank Account, Property, Investment Account  
// income_expenditure: Employment Income, Living Expenses
// protection: Life Insurance, Income Protection
// vulnerability_health: Health Conditions, Vulnerable Indicators
```

### Product Owner Field Patterns

**Rule:** Product owner field structure depends on item category:

| Category | Field Name | Structure | Example |
|----------|-----------|-----------|---------|
| basic_detail | `product_owners` | Array of IDs | `[123, 456]` |
| income_expenditure | `product_owners` | Array of IDs | `[123]` |
| assets_liabilities | `associated_product_owners` | Ownership object | `{"association_type": "tenants_in_common", "123": 60.00, "456": 40.00}` |
| protection | `associated_product_owners` | Ownership object | Same as assets |
| vulnerability_health | `product_owners` | Array of IDs | `[123, 456]` |

```typescript
// TypeScript type definitions for product owner patterns

// Pattern 1: Simple Product Owner Array
interface BasicDetailItemData {
  product_owners: number[];  // Simple array of product owner IDs
  // ... category-specific fields
}

interface IncomeExpenditureItemData {
  product_owners: number[];  // Simple array
  description: string;
  amount: number;
  frequency: string;
  date: string;
  notes?: string;
}

interface VulnerabilityHealthItemData {
  product_owners: number[];  // Simple array
  // ... category-specific fields
}

// Pattern 2: Complex Ownership Structure
interface AssetsLiabilitiesItemData {
  associated_product_owners: {
    association_type: "joint_tenants" | "tenants_in_common" | "individual";
    [product_owner_id: string]: number | string;  // ID -> percentage mapping
  };
  current_value?: number;
  value_date?: string;
  start_date?: string;
  // ... category-specific fields
}

interface ProtectionItemData {
  associated_product_owners: {
    association_type: "joint_tenants" | "tenants_in_common" | "individual";
    [product_owner_id: string]: number | string;
  };
  sum_assured?: number;
  premium_amount?: number;
  // ... category-specific fields
}

// Union type for all item data content
type ItemDataContent =
  | BasicDetailItemData
  | IncomeExpenditureItemData
  | AssetsLiabilitiesItemData
  | ProtectionItemData
  | VulnerabilityHealthItemData;
```

### Query Examples for Product Owner Filtering

**Filtering items by product owner across both patterns**:

```sql
-- Pattern 1: Find items with simple product_owners array (basic_detail, income_expenditure, vulnerability_health)
-- Find all Address items for product owner ID 123
SELECT *
FROM client_information_items
WHERE item_type IN ('basic_detail', 'income_expenditure', 'vulnerability_health')
  AND data_content->'product_owners' @> '[123]'::jsonb;

-- Pattern 2: Find items with complex associated_product_owners (assets_liabilities, protection)
-- Find all assets owned (partially or fully) by product owner ID 123
SELECT *
FROM client_information_items
WHERE item_type IN ('assets_liabilities', 'protection')
  AND data_content->'associated_product_owners' ? '123';

-- Combined: Find ALL items for a specific product owner (both patterns)
SELECT *
FROM client_information_items
WHERE
  -- Pattern 1: Simple array
  (data_content->'product_owners' @> '[123]'::jsonb)
  OR
  -- Pattern 2: Complex ownership
  (data_content->'associated_product_owners' ? '123');

-- Find items with multiple owners (Pattern 1)
SELECT *
FROM client_information_items
WHERE data_content->'product_owners' @> '[123, 456]'::jsonb;

-- Find tenants_in_common items with specific ownership percentage
SELECT *,
  (data_content->'associated_product_owners'->>'123')::numeric AS ownership_percentage
FROM client_information_items
WHERE data_content->'associated_product_owners'->>'association_type' = 'tenants_in_common'
  AND data_content->'associated_product_owners' ? '123'
  AND (data_content->'associated_product_owners'->>'123')::numeric >= 50.00;

-- Validate ownership percentages total 100%
SELECT id, item_type,
  data_content->'associated_product_owners' AS ownership,
  (
    SELECT SUM((value)::numeric)
    FROM jsonb_each_text(data_content->'associated_product_owners')
    WHERE key ~ '^[0-9]+$'  -- Only numeric keys
  ) AS total_percentage
FROM client_information_items
WHERE data_content->'associated_product_owners' IS NOT NULL
  AND data_content->'associated_product_owners'->>'association_type' = 'tenants_in_common';
```

```typescript
// TypeScript/JavaScript query examples using API

// Find all items for a specific product owner
const getItemsByProductOwner = async (clientGroupId: number, productOwnerId: number) => {
  const response = await fetch(
    `/api/client_groups/${clientGroupId}/information_items?product_owner_id=${productOwnerId}`
  );
  return response.json();
};

// Filter by category and product owner
const getBasicDetailItems = async (clientGroupId: number, productOwnerId: number) => {
  const items = await fetch(
    `/api/client_groups/${clientGroupId}/information_items?` +
    `item_type=basic_detail&product_owner_id=${productOwnerId}`
  ).then(r => r.json());

  return items.filter(item =>
    item.data_content.product_owners?.includes(productOwnerId)
  );
};

// Get ownership percentage for an asset
const getOwnershipPercentage = (item: any, productOwnerId: number): number => {
  if (item.category === 'assets_liabilities' || item.category === 'protection') {
    const ownership = item.data_content.associated_product_owners;
    return ownership?.[productOwnerId.toString()] || 0;
  }
  return 0; // Not applicable for simple pattern
};

// Validate ownership percentages
const validateOwnership = (item: any): { valid: boolean; total: number; error?: string } => {
  const ownership = item.data_content.associated_product_owners;
  if (!ownership) return { valid: false, total: 0, error: 'Missing ownership data' };

  const { association_type, ...percentages } = ownership;
  const total = Object.values(percentages).reduce((sum: number, pct: any) => sum + Number(pct), 0);

  if (association_type === 'tenants_in_common' && Math.abs(total - 100) > 0.01) {
    return { valid: false, total, error: `Percentages must total 100% (current: ${total.toFixed(2)}%)` };
  }

  return { valid: true, total };
};
```

### Individual Ownership Pattern Clarification

**IMPORTANT**: For individual (100%) ownership, use this format:

```json
{
  "associated_product_owners": {
    "association_type": "individual",
    "123": 100.00  // product_owner_id as key, 100.00 as value
  }
}
```

**NOT** any of these incorrect formats:
```json
// ❌ WRONG - Don't use product_owner_id field
{
  "associated_product_owners": {
    "association_type": "individual",
    "product_owner_id": 123
  }
}

// ❌ WRONG - Don't use array for complex pattern
{
  "associated_product_owners": [123]
}

// ❌ WRONG - Don't mix patterns
{
  "product_owners": [123],
  "associated_product_owners": {...}
}
```

## 🔗 API Endpoints Summary

### Client Information Items
```http
GET    /api/client_groups/{id}/information_items?item_type=basic_detail&search=bank&limit=20
POST   /api/client_groups/{id}/information_items  
PUT    /api/client_groups/{id}/information_items/{item_id}
DELETE /api/client_groups/{id}/information_items/{item_id}
```

### Unmanaged Products  
```http
GET    /api/client_groups/{id}/unmanaged_products?product_type=GIAs&status=active
POST   /api/client_groups/{id}/unmanaged_products
PUT    /api/client_groups/{id}/unmanaged_products/{product_id}
DELETE /api/client_groups/{id}/unmanaged_products/{product_id}
```

### Networth & Reports
```http
GET    /api/client_groups/{id}/networth_statements?limit=10
POST   /api/client_groups/{id}/networth_statements  # Create snapshot
GET    /api/client_groups/{id}/kyc_report           # Generate KYC report
```

### Actions & Objectives
```http
GET    /api/client_groups/{id}/actions?status=outstanding&owner=advisor
POST   /api/client_groups/{id}/actions
GET    /api/client_groups/{id}/objectives?status=active
POST   /api/client_groups/{id}/objectives
```

## ⚛️ Frontend Components

### New Page Structure
```
ClientDetailsPage (enhanced with 5-tab navigation)
├── ClientInformation (Tab 1) - Information items by type
├── UnmanagedProducts (Tab 2) - Simple product tracking  
├── Actions (Tab 3) - Task management
├── Objectives (Tab 4) - Goal tracking
└── Networth (Tab 5) - Statements & snapshots
```

### Key Component Imports
```typescript
import { 
  ClientInformationManager,
  UnmanagedProductManager, 
  OwnershipEditor,
  NetworthStatementGenerator,
  KYCReportBuilder
} from '@/components/phase2';

import { useClientInformation, useUnmanagedProducts } from '@/hooks/phase2';
```

### Component Usage Patterns
```typescript
// Information Items Management
<ClientInformationManager 
  clientGroupId={123}
  itemType="assets_liabilities"
  onItemUpdate={handleItemUpdate}
/>

// Unmanaged Products  
<UnmanagedProductManager
  clientGroupId={123}
  onProductCreate={handleProductCreate}
  excludeFromAnalytics={true}  // Always true for Phase 2
/>

// Ownership Editor (shared component)
<OwnershipEditor
  ownershipData={ownershipDetails}
  productOwners={availableOwners}
  onOwnershipChange={handleOwnershipUpdate}
  precision={0.01}  // 0.01% precision required
/>
```

## 💻 Development Commands

### Backend Development
```bash
# Start FastAPI server
cd backend && uvicorn main:app --reload --host 127.0.0.1 --port 8001

# Install Phase 2 dependencies  
pip install -r requirements.txt

# Run Phase 2 specific tests
pytest tests/phase2/ -v --cov=app/phase2 --cov-report=html

# Database migration (Phase 2)
python scripts/migrate_phase2.py --dry-run  # Test migration
python scripts/migrate_phase2.py --execute  # Execute migration
```

### Frontend Development  
```bash
# Start Vite dev server
cd frontend && npm start  # Port 3000

# Install Phase 2 dependencies
npm install

# Run Phase 2 component tests
npm test -- --testPathPattern=phase2 --coverage --watchAll=false

# Build with Phase 2 components
npm run build && npm run preview
```

### Database Operations
```bash
# Connect to database
psql $DATABASE_URL

# Backup before migration
pg_dump $DATABASE_URL > backup_pre_phase2.sql

# Validate Phase 2 schema
python scripts/validate_phase2_schema.py

# Check JSON data integrity  
SELECT * FROM validate_backup_json_integrity() WHERE invalid_json_count > 0;
```

## ⚙️ Key Constants & Configuration

### Environment Variables (.env)
```bash
# Existing requirements
DATABASE_URL=postgresql://user:pass@host:port/kingstons_portal
JWT_SECRET=your-jwt-secret
ACCESS_TOKEN_EXPIRE_MINUTES=1440

# Phase 2 specific (optional)
PHASE2_SNAPSHOT_RETENTION_DAYS=365
PHASE2_JSON_MAX_SIZE_KB=64
PHASE2_CONCURRENT_USERS_MAX=4
```

### Frontend Constants
```typescript
// src/constants/phase2Constants.ts
export const PHASE2_CONSTANTS = {
  ITEM_TYPES: ['basic_detail', 'income_expenditure', 'assets_liabilities', 'protection', 'vulnerability_health'],
  UNMANAGED_PRODUCT_TYPES: ['GIAs', 'Stocks_and_Shares_ISAs', 'Cash_ISAs', 'Bank_Accounts', 'Pensions'],
  OWNERSHIP_PRECISION: 0.01,  // 0.01% precision
  MAX_JSON_SIZE: 65536,       // 64KB limit
  PAGINATION_DEFAULT_LIMIT: 50,
  PAGINATION_MAX_LIMIT: 200
};

export const OWNERSHIP_TYPES = {
  INDIVIDUAL: 'individual',
  TENANTS_IN_COMMON: 'tenants_in_common', 
  JOINT_OWNERSHIP: 'joint_ownership'
} as const;
```

## 🧪 Testing Patterns

### Unit Tests
```typescript
// Jest + React Testing Library
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { ClientInformationManager } from '@/components/phase2/ClientInformationManager';

describe('ClientInformationManager', () => {
  it('should create information item with valid ownership', async () => {
    render(<ClientInformationManager clientGroupId={123} />);
    
    // Test ownership validation
    fireEvent.change(screen.getByLabelText('Ownership %'), { target: { value: '75.5' } });
    fireEvent.click(screen.getByText('Save Item'));
    
    await waitFor(() => {
      expect(screen.getByText('Item saved successfully')).toBeInTheDocument();
    });
  });
});
```

### API Tests  
```typescript
// Backend pytest
def test_create_information_item():
    response = client.post(
        f"/api/client_groups/123/information_items",
        json={
            "item_type": "assets_liabilities",
            "item_category": "Bank Account", 
            "data_content": {"bank": "Barclays", "latest_valuation": 2500.00}
        },
        headers=auth_headers
    )
    assert response.status_code == 201
    assert response.json()["data"]["id"] is not None
```

### Coverage Requirements
- **Minimum**: 70% overall coverage
- **Critical Path**: 95% for ownership logic
- **JSON Validation**: 100% for all schemas
- **Concurrent Users**: Mandatory 4-user testing

## 🔄 Common Code Patterns

### Error Handling
```typescript
// Frontend error handling
try {
  await createInformationItem(itemData);
  showSuccess('Information item created');
} catch (error) {
  if (error.response?.status === 409) {
    showError('Ownership percentages exceed 100%');
  } else {
    showError('Failed to create information item');
  }
}
```

### Ownership Validation
```typescript
// Frontend ownership validation
const validateOwnership = (ownershipDetails: OwnershipDetails): boolean => {
  if (ownershipDetails.association_type === 'individual') return true;
  
  const total = Object.entries(ownershipDetails)
    .filter(([key]) => /^\d+$/.test(key))  // Only numeric keys
    .reduce((sum, [_, percentage]) => sum + Number(percentage), 0);
    
  return total <= 100.01;  // Allow 0.01% tolerance
};
```

### JSON Schema Validation
```python
# Backend Pydantic models
class InformationItemCreate(BaseModel):
    item_type: Literal["basic_detail", "income_expenditure", "assets_liabilities", "protection", "vulnerability_health"]
    item_category: str = Field(..., min_length=1, max_length=100)
    data_content: dict = Field(..., max_items=50)  # Max 50 fields
    
    @validator('data_content')
    def validate_json_size(cls, v):
        if len(json.dumps(v)) > 65536:  # 64KB limit
            raise ValueError('JSON content exceeds 64KB limit')
        return v
```

## 🚨 Troubleshooting

### Common Issues & Solutions

| Issue | Symptom | Solution |
|-------|---------|----------|
| **Ownership > 100%** | API 409 error | Check percentage calculations, ensure ≤100.01% |
| **JSON Too Large** | API 400 error | Reduce JSON content, check 64KB limit |
| **Missing Product Owners** | Empty dropdowns | Verify product_owners table has data |
| **Slow Queries** | Page timeouts | Check GIN indexes on JSONB fields exist |
| **Migration Fails** | Database errors | Run dry-run first, check data integrity |

### Performance Diagnostics
```sql
-- Check JSON query performance  
EXPLAIN (ANALYZE, BUFFERS) 
SELECT * FROM client_information_items 
WHERE client_group_id = 123 AND data_content ? 'latest_valuation';

-- Monitor index usage
SELECT schemaname, tablename, indexname, idx_scan 
FROM pg_stat_user_indexes 
WHERE tablename LIKE 'client_%' 
ORDER BY idx_scan DESC;
```

### Debug Commands
```bash
# Check Phase 2 table sizes
psql -c "SELECT schemaname, tablename, pg_size_pretty(pg_total_relation_size(tablename::text)) as size FROM information_schema.tables WHERE table_schema = 'public' AND table_name LIKE 'client_%';"

# Validate all ownership percentages  
python scripts/validate_ownership_integrity.py --table=client_products --table=client_unmanaged_products
```

## 📈 Performance Targets

### Response Time Requirements
- **List Operations**: <500ms (information items, unmanaged products)  
- **Complex Queries**: <2s (networth statements, KYC reports)
- **Snapshot Creation**: <5s (background processing)
- **Page Load Times**: <2s (all new Phase 2 pages)

### Concurrency Limits  
- **Max Concurrent Users**: 4 users simultaneously
- **Database Connections**: 20 connection pool max
- **JSON Query Performance**: <2s with GIN indexes
- **Backup Impact**: +15 minutes to nightly backup (acceptable)

### Memory & Storage
- **Database Growth**: +15% (estimated 2GB for 130 clients)
- **Memory Usage**: <5% increase from JSON indexing
- **Cache Strategy**: Snapshots cached, dynamic data not cached
- **API Rate Limits**: Default FastAPI limits (no changes)

---

**📍 Quick Navigation**: [Full Phase 2 Docs](../README_PHASE2.md) | [API Reference](../03_architecture/11_phase2_api_endpoints.md) | [Database Schema](../03_architecture/10_phase2_database_schema.md) | [Implementation Sequence](../04_development_workflow/05_phase2_implementation_sequence.md)