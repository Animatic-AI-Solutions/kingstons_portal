# Health and Vulnerabilities Tab - Implementation Plan Overview

## Quick Navigation

| File | Cycle | Description | Agent(s) |
|------|-------|-------------|----------|
| [01_cycle_1](./01_cycle_1_health_po_api.md) | 1 | Health Product Owners API | Tester-Agent, coder-agent |
| [02_cycle_2](./02_cycle_2_health_sr_api.md) | 2 | Health Special Relationships API | Tester-Agent, coder-agent |
| [03_cycle_3](./03_cycle_3_vuln_po_api.md) | 3 | Vulnerabilities Product Owners API | Tester-Agent, coder-agent |
| [04_cycle_4](./04_cycle_4_vuln_sr_api.md) | 4 | Vulnerabilities Special Relationships API | Tester-Agent, coder-agent |
| [05_cycle_5](./05_cycle_5_frontend_types.md) | 5 | Frontend TypeScript Types | Tester-Agent, coder-agent |
| [06_cycle_6](./06_cycle_6_services_hooks.md) | 6 | API Services & React Query Hooks | Tester-Agent, coder-agent |
| [07_cycle_7](./07_cycle_7_person_table.md) | 7 | PersonTable Component | Tester-Agent, coder-agent |
| [08_cycle_8](./08_cycle_8_health_table.md) | 8 | HealthConditionsTable Component | Tester-Agent, coder-agent |
| [09_cycle_9](./09_cycle_9_vuln_table.md) | 9 | VulnerabilitiesTable Component | Tester-Agent, coder-agent |
| [10_cycle_10](./10_cycle_10_add_modal.md) | 10 | AddHealthVulnerabilityModal | Tester-Agent, coder-agent |
| [10.5_cycle_10.5](./10.5_cycle_10.5_edit_modal.md) | 10.5 | EditHealthVulnerabilityModal | Tester-Agent, coder-agent |
| [11_cycle_11](./11_cycle_11_health_subtab.md) | 11 | HealthSubTab Component | Tester-Agent, coder-agent |
| [12_cycle_12](./12_cycle_12_vuln_subtab.md) | 12 | VulnerabilitiesSubTab Component | Tester-Agent, coder-agent |
| [13_cycle_13](./13_cycle_13_parent_tab.md) | 13 | HealthVulnerabilityTab Parent | Tester-Agent, coder-agent |
| [14_cycle_14](./14_cycle_14_integration.md) | 14 | Integration & Polish | Tester-Agent, coder-agent |

---

## Requirements Summary

### Core Features

1. **Sub-tabs**: Health and Vulnerabilities tab with two sub-tabs
2. **Person Table**: Shows product owners (top) and special relationships (bottom with purple/SR tag)
3. **Expandable Rows**: Click to expand showing nested health/vulnerability tables
4. **Smoking First**: Smoking conditions always appear at top of health tables
5. **Add Modal**: Add button in person row opens modal for new records

### Data Sources

- `health_product_owners` / `health_special_relationships`
- `vulnerabilities_product_owners` / `vulnerabilities_special_relationships`

---

## UI Column Specifications

### Person List Table (Main)

| Column | Description |
|--------|-------------|
| **Name** | Person's name (SR tag for special relationships) |
| **Relationship** | e.g., "Primary Owner", "Spouse" |
| **Active** | Count of active health/vulnerabilities |
| **Inactive** | Count of inactive health/vulnerabilities |
| **Actions** | Add icon button (opens modal) |

### Health Conditions Table (Nested)

| Column | DB Field |
|--------|----------|
| **Condition** | condition |
| **Name** | name |
| **Diagnosed** | date_of_diagnosis |
| **Medication/Dosage** | medication |
| **Status** | status |
| **Actions** | Edit/Delete |

### Vulnerabilities Table (Nested)

| Column | DB Field |
|--------|----------|
| **Description** | description |
| **Adjustments** | adjustments |
| **Diagnosed** | diagnosed (Yes/No) |
| **Recorded** | date_recorded |
| **Status** | status |
| **Actions** | Edit/Delete |

---

## TDD Process for Each Cycle

```
RED Phase   → Use Tester-Agent to write failing tests
GREEN Phase → Use coder-agent to implement code to pass tests
BLUE Phase  → Refactor and optimize
```

---

## JSDoc Documentation Standards

**ALL code must include comprehensive JSDoc comments.** This is mandatory for:

### Functions/Methods
```typescript
/**
 * Fetches health records for product owners in a client group
 * @param {number} clientGroupId - The ID of the client group
 * @param {number} [productOwnerId] - Optional specific product owner ID
 * @returns {Promise<HealthCondition[]>} Array of health conditions
 * @throws {ApiError} When the API request fails
 * @example
 * const health = await fetchHealthProductOwners({ clientGroupId: 1 });
 */
```

### Components
```typescript
/**
 * PersonTable Component
 *
 * Displays product owners and special relationships in a table with
 * expandable rows showing health conditions or vulnerabilities.
 *
 * @component
 * @param {PersonTableProps} props - Component props
 * @param {PersonWithCounts[]} props.productOwners - List of product owners
 * @param {PersonWithCounts[]} props.specialRelationships - List of special relationships
 * @param {function} props.onAdd - Callback when add button clicked
 * @param {function} props.onRowClick - Callback when row clicked
 * @returns {JSX.Element} Rendered table component
 *
 * @example
 * <PersonTable
 *   productOwners={owners}
 *   specialRelationships={relationships}
 *   onAdd={handleAdd}
 *   onRowClick={handleRowClick}
 * />
 */
```

### Interfaces/Types
```typescript
/**
 * Health condition record for a product owner or special relationship
 * @interface HealthCondition
 * @property {number} id - Unique identifier
 * @property {number} [product_owner_id] - FK to product_owners table
 * @property {number} [special_relationship_id] - FK to special_relationships table
 * @property {string} condition - Condition type (e.g., "Smoking", "Diabetes")
 * @property {string|null} name - Specific condition name
 * @property {HealthStatus} status - Current status
 */
```

### Constants
```typescript
/**
 * Smoking-related conditions that should appear at top of health tables
 * @constant {readonly string[]}
 */
export const SMOKING_CONDITIONS = [...] as const;
```

### Hooks
```typescript
/**
 * Custom hook for fetching health records for product owners
 *
 * @param {number} clientGroupId - The client group ID to fetch health records for
 * @returns {UseQueryResult<HealthCondition[]>} React Query result object
 * @returns {HealthCondition[]} returns.data - Array of health conditions
 * @returns {boolean} returns.isLoading - Loading state
 * @returns {Error|null} returns.error - Error if request failed
 *
 * @example
 * const { data: health, isLoading } = useHealthProductOwners(clientGroupId);
 */
```

---

## File Structure (Target)

```
backend/
  app/api/routes/
    health.py
    vulnerabilities.py
  app/models/
    health.py
    vulnerability.py
  tests/
    test_health_routes.py
    test_vulnerabilities_routes.py

frontend/src/
  types/
    healthVulnerability.ts
  services/
    healthVulnerabilityApi.ts
  hooks/
    useHealthVulnerabilities.ts
  components/phase2/health-vulnerabilities/
    index.ts
    PersonTable.tsx
    HealthConditionsTable.tsx
    VulnerabilitiesTable.tsx
    AddHealthVulnerabilityModal.tsx
    HealthSubTab.tsx
    VulnerabilitiesSubTab.tsx
    HealthVulnerabilityTab.tsx
  tests/components/phase2/health-vulnerabilities/
    [corresponding test files]
```

---

## Estimated Timeline

| Phase | Cycles | Hours |
|-------|--------|-------|
| Backend APIs | 1-4 | 6-10 |
| Types & Services | 5-6 | 3-5 |
| Components | 7-13 | 14-21 |
| Integration | 14 | 3-4 |
| **Total** | 14 | **26-40** |
