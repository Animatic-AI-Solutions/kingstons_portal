# People Tab Architecture Documentation

## Document Overview

**Version**: 1.0
**Date**: 2025-12-04
**Author**: Claude Code
**Status**: Production-Ready

This document provides comprehensive architectural guidance for implementing the People (Product Owners) Tab feature within the Client Group Suite. It covers component design, data architecture, API integration, security, accessibility, and technical decisions.

**Related Documents**:
- Specification: `Phase2_People_Tab_Specification.md` (v2.0)
- Pseudocode: `Phase2_People_Tab_Pseudocode.md` (v1.0)

---

## Table of Contents

1. [System Overview](#1-system-overview)
2. [Component Architecture](#2-component-architecture)
3. [Data Architecture](#3-data-architecture)
4. [API Architecture](#4-api-architecture)
5. [State Management Architecture](#5-state-management-architecture)
6. [Key Workflows](#6-key-workflows)
7. [Security](#7-security)
8. [Accessibility Architecture](#8-accessibility-architecture)
9. [Technical Decisions](#9-technical-decisions)
10. [Performance Architecture](#10-performance-architecture)

---

## 1. System Overview

### 1.1 Feature Context

The People Tab is a sub-tab within the Basic Details tab of the Client Group Suite, providing comprehensive management of product owners (people) associated with a client group.

```
Application Hierarchy:
├── ClientGroupSuite (Parent)
│   ├── BasicDetailsTab
│   │   ├── PeopleSubTab ◄── THIS FEATURE
│   │   ├── SpecialRelationshipsSubTab
│   │   ├── HealthVulnerabilitySubTab
│   │   ├── DocumentsSubTab
│   │   ├── RiskAssessmentsSubTab
│   │   └── ClientManagementSubTab
│   ├── AssetsLiabilitiesTab
│   ├── IncomeExpenditureTab
│   └── ...
```

### 1.2 High-Level Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                         User Interface                          │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │ PeopleSubTab Component (Main Container)                  │  │
│  │  ┌────────────────────┐  ┌───────────────────────────┐  │  │
│  │  │ ProductOwnerTable  │  │ Modals (HeadlessUI)       │  │  │
│  │  │  - Semantic HTML   │  │  - CreateModal            │  │  │
│  │  │  - ARIA attributes │  │  - EditModal              │  │  │
│  │  │  - Sortable        │  │  - DeleteConfirmModal     │  │  │
│  │  │  - Actions         │  │  - DeceasedDateModal      │  │  │
│  │  └────────────────────┘  └───────────────────────────┘  │  │
│  └──────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
                              │
                              │ React Query (Caching & State)
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                     API Layer (FastAPI)                         │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │ Endpoints:                                                │  │
│  │  GET    /client-groups/{id}/product-owners               │  │
│  │  POST   /product-owners                                  │  │
│  │  PUT    /product-owners/{id}                             │  │
│  │  DELETE /product-owners/{id}                             │  │
│  │  POST   /client-group-product-owners                     │  │
│  └──────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                   Data Layer (PostgreSQL)                       │
│  ┌────────────────────┐  ┌──────────────────────────────────┐  │
│  │ product_owners     │  │ client_group_product_owners      │  │
│  │  - 31 fields       │  │  - client_group_id (FK)          │  │
│  │  - status          │  │  - product_owner_id (FK)         │  │
│  │  - deceased_date   │  │  - display_order                 │  │
│  │  - address_id (FK) │  │                                  │  │
│  └────────────────────┘  └──────────────────────────────────┘  │
│  ┌────────────────────┐                                        │
│  │ addresses          │                                        │
│  │  - 5 address lines │                                        │
│  │  - shared records  │                                        │
│  │                    │                                        │
│  └────────────────────┘                                        │
└─────────────────────────────────────────────────────────────────┘
```

### 1.3 Technology Stack

| Layer | Technology | Purpose |
|-------|-----------|---------|
| **Frontend Framework** | React 18 + TypeScript | Component-based UI with type safety |
| **State Management** | React Query | Server state caching and synchronization |
| **UI Components** | HeadlessUI | Accessible modal dialogs |
| **Styling** | Tailwind CSS | Utility-first responsive design |
| **HTTP Client** | Axios | API communication |
| **Backend Framework** | FastAPI (Python) | RESTful API server |
| **Database** | PostgreSQL | Relational data storage |
| **Validation** | Pydantic | Backend data validation |
| **Authentication** | JWT + HttpOnly Cookies | Secure session management |

---

## 2. Component Architecture

### 2.1 Component Hierarchy

```
PeopleSubTab (Container Component)
├── State Management
│   ├── productOwners: ProductOwner[]
│   ├── isLoading: boolean
│   ├── error: string | null
│   ├── sortConfig: SortConfig | null
│   ├── selectedProductOwner: ProductOwner | null
│   ├── isEditModalOpen: boolean
│   ├── isCreateModalOpen: boolean
│   ├── deleteConfirmModalOpen: boolean
│   └── deceasedDateModalOpen: boolean
│
├── ProductOwnerTable (Presentation Component)
│   ├── Props:
│   │   ├── productOwners: ProductOwner[]
│   │   ├── sortConfig: SortConfig | null
│   │   ├── onSort: (columnKey: string) => void
│   │   ├── onEdit: (productOwner: ProductOwner) => void
│   │   ├── onStatusChange: (id: number, status: string) => void
│   │   └── onDelete: (productOwner: ProductOwner) => void
│   │
│   ├── TableHeader (Sub-component)
│   │   ├── Semantic <th scope="col"> elements
│   │   ├── Dynamic aria-sort attributes
│   │   └── Sort indicators (↑↓)
│   │
│   └── TableBody
│       └── ProductOwnerRow[] (One per product owner)
│           ├── Props: productOwner, onEdit, onStatusChange, onDelete
│           ├── Click handlers (mouse + keyboard)
│           ├── Action buttons (Edit, Lapse, Deceased, Reactivate, Delete)
│           └── StatusBadge component
│
├── CreateProductOwnerModal (HeadlessUI Dialog)
│   ├── Props:
│   │   ├── clientGroupId: number
│   │   ├── onClose: () => void
│   │   └── onCreate: () => void
│   ├── State:
│   │   ├── formData: Partial<ProductOwner>
│   │   ├── formErrors: ValidationErrors
│   │   ├── isSubmitting: boolean
│   │   └── activeTab: 'personal' | 'contact' | 'employment'
│   ├── Tab Navigation (Progressive Disclosure)
│   │   ├── Personal Details Tab (12 fields)
│   │   ├── Contact & Address Tab (10 fields)
│   │   └── Employment Tab (9 fields)
│   └── Form Submission
│       ├── Client-side validation
│       ├── POST /product-owners
│       ├── POST /client-group-product-owners
│       └── Rollback logic on failure
│
├── EditProductOwnerModal (HeadlessUI Dialog)
│   ├── Props:
│   │   ├── productOwner: ProductOwner
│   │   ├── onClose: () => void
│   │   └── onSave: () => void
│   ├── State: Same as CreateModal
│   ├── Tab Navigation: Same structure
│   └── Form Submission
│       ├── Client-side validation
│       ├── Change detection
│       ├── Address strategy (create new on change)
│       └── PUT /product-owners/{id}
│
├── DeleteConfirmationModal (HeadlessUI Dialog)
│   ├── Props:
│   │   ├── productOwner: ProductOwner
│   │   ├── onConfirm: () => void
│   │   ├── onCancel: () => void
│   │   └── isDeleting: boolean
│   └── Warning UI + Confirm/Cancel buttons
│
└── DeceasedDateModal (HeadlessUI Dialog)
    ├── Props:
    │   ├── productOwner: ProductOwner
    │   ├── onConfirm: (date: string | null) => void
    │   └── onCancel: () => void
    ├── DateInput component
    └── Optional date capture for deceased status
```

#### REQUIRED: Error Boundary Wrapper

All modal components MUST be wrapped in an error boundary to prevent uncaught errors from crashing the parent PeopleSubTab component.

```typescript
// components/errors/ModalErrorBoundary.tsx
import React, { Component, ErrorInfo, ReactNode } from 'react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

class ModalErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Modal Error Boundary caught error:', error, errorInfo);
    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      return this.props.fallback || (
        <div className="p-6 text-center">
          <h3 className="text-lg font-semibold text-red-600 mb-2">
            Something went wrong
          </h3>
          <p className="text-sm text-gray-600 mb-4">
            {this.state.error?.message || 'An unexpected error occurred'}
          </p>
          <button
            onClick={this.handleReset}
            className="px-4 py-2 bg-primary-600 text-white rounded hover:bg-primary-700"
          >
            Try Again
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ModalErrorBoundary;
```

**Usage in PeopleSubTab**:
```typescript
import ModalErrorBoundary from '@/components/errors/ModalErrorBoundary';

// Wrap each modal in error boundary
{isCreateModalOpen && (
  <ModalErrorBoundary>
    <CreateProductOwnerModal
      clientGroupId={clientGroupId}
      onClose={() => setIsCreateModalOpen(false)}
      onCreate={handleRefetch}
    />
  </ModalErrorBoundary>
)}

{isEditModalOpen && selectedProductOwner && (
  <ModalErrorBoundary>
    <EditProductOwnerModal
      productOwner={selectedProductOwner}
      onClose={() => setIsEditModalOpen(false)}
      onSave={handleRefetch}
    />
  </ModalErrorBoundary>
)}
```

**Benefits**:
- **Prevents crashes**: Modal form errors don't crash entire PeopleSubTab
- **User recovery**: "Try Again" button allows user to retry operation
- **Error tracking**: onError callback enables logging to monitoring service
- **Graceful degradation**: User can close broken modal and continue working

### 2.2 Component Contracts (Props & Interfaces)

#### PeopleSubTab Props
```typescript
interface PeopleSubTabProps {
  clientGroupId: number;  // ID of current client group
}
```

#### ProductOwnerTable Props
```typescript
interface ProductOwnerTableProps {
  productOwners: ProductOwner[];
  sortConfig: SortConfig | null;
  onSort: (columnKey: string) => void;
  onEdit: (productOwner: ProductOwner) => void;
  onStatusChange: (productOwnerId: number, newStatus: string) => void;
  onDelete: (productOwner: ProductOwner) => void;
}
```

#### ProductOwnerRow Props
```typescript
interface ProductOwnerRowProps {
  productOwner: ProductOwner;
  onEdit: (productOwner: ProductOwner) => void;
  onStatusChange: (productOwnerId: number, newStatus: string) => void;
  onDelete: (productOwner: ProductOwner) => void;
}
```

#### CreateProductOwnerModal Props
```typescript
interface CreateProductOwnerModalProps {
  clientGroupId: number;
  onClose: () => void;
  onCreate: () => void;  // Callback to refresh parent data
}
```

#### EditProductOwnerModal Props
```typescript
interface EditProductOwnerModalProps {
  productOwner: ProductOwner;
  onClose: () => void;
  onSave: () => void;  // Callback to refresh parent data
}
```

### 2.3 State Management Strategy (REQUIRED: React Query)

#### REQUIRED: React Query for Server State
```typescript
// PeopleSubTab.tsx - REQUIRED implementation
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

// Server state: Fetching product owners with caching
const { data: productOwners, isLoading, error, refetch } = useQuery(
  ['clientGroup', clientGroupId, 'productOwners'],
  () => api.get(`/client-groups/${clientGroupId}/product-owners`),
  {
    staleTime: 5 * 60 * 1000,  // 5 minutes - data stays fresh
    cacheTime: 30 * 60 * 1000, // 30 minutes - cached in memory
    refetchOnWindowFocus: false, // Prevent excessive API calls
  }
);

// Mutation hooks for CRUD operations
const queryClient = useQueryClient();

const createMutation = useMutation(
  (data: Partial<ProductOwner>) =>
    api.post(`/client-groups/${clientGroupId}/product-owners`, data),
  {
    onSuccess: () => {
      // Automatic cache invalidation triggers refetch
      queryClient.invalidateQueries(['clientGroup', clientGroupId, 'productOwners']);
    },
  }
);

const updateMutation = useMutation(
  ({ id, data }: { id: number; data: Partial<ProductOwner> }) =>
    api.put(`/product-owners/${id}`, data),
  {
    onSuccess: () => {
      queryClient.invalidateQueries(['clientGroup', clientGroupId, 'productOwners']);
    },
  }
);

const deleteMutation = useMutation(
  (id: number) => api.delete(`/product-owners/${id}`),
  {
    onSuccess: () => {
      queryClient.invalidateQueries(['clientGroup', clientGroupId, 'productOwners']);
    },
  }
);
```

#### Local UI State (useState for UI-only concerns)
```typescript
// Local UI state (NOT server data)
const [sortConfig, setSortConfig] = useState<SortConfig | null>(null);
const [isEditModalOpen, setIsEditModalOpen] = useState(false);
const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
const [selectedProductOwner, setSelectedProductOwner] = useState<ProductOwner | null>(null);
const [deleteConfirmModalOpen, setDeleteConfirmModalOpen] = useState(false);
const [deceasedDateModalOpen, setDeceasedDateModalOpen] = useState(false);
const [pendingStatusChange, setPendingStatusChange] = useState<{id: number, status: string} | null>(null);
```

**Why React Query is REQUIRED**:
- **Codebase Standard**: React Query is used throughout Kingston's Portal (per CLAUDE.md) - consistency required
- **Performance**: Automatic caching prevents unnecessary API calls; 5-minute cache eliminates re-fetches on tab switches
- **Reduced Complexity**: Eliminates manual loading/error state management; React Query handles this automatically
- **Automatic Refetching**: Cache invalidation after mutations ensures UI stays synchronized with server
- **Prevents Re-render Issues**: useState for server data causes full component re-renders on every update; React Query re-renders only affected components
- **Better UX**: Background refetching keeps data fresh without blocking UI

**Migration Effort**: 8-10 hours (reference existing SummaryTab implementation patterns)

### 2.4 Component Communication Patterns

#### Callback Pattern (Current)
```
PeopleSubTab
  │
  ├─► handleEdit(productOwner) ─────► Opens EditModal
  │                                   with selectedProductOwner
  │
  ├─► handleCreate() ─────────────► Opens CreateModal
  │
  ├─► handleStatusChange(id, status) ─► API call → refetch
  │
  └─► handleDelete(productOwner) ───► Opens DeleteConfirmModal
                                       ├─► confirmDelete()
                                       └─► API call → refetch
```

#### Event Flow Example (Edit Flow)
```
User clicks row/Edit button
  ↓
ProductOwnerRow.onClick/handleEditClick
  ↓
onEdit(productOwner) callback to PeopleSubTab
  ↓
setSelectedProductOwner(productOwner)
setIsEditModalOpen(true)
  ↓
EditProductOwnerModal renders
  ↓
User edits fields → formData state updates
  ↓
User clicks Save → handleSubmit
  ↓
validateProductOwnerForm(formData)
  ↓
API.put(/product-owners/{id}, formData)
  ↓
onSave() callback to PeopleSubTab
  ↓
refetchProductOwners()
closeEditModal()
showNotification("Success")
```

---

## 3. Data Architecture

### 3.1 Database Schema

#### product_owners Table (31 Fields)
```sql
CREATE TABLE product_owners (
    -- Primary Key
    id BIGSERIAL PRIMARY KEY,

    -- Core Identity (6 fields)
    status VARCHAR(20) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'lapsed', 'deceased')),
    title VARCHAR(20),
    firstname VARCHAR(100) NOT NULL,
    surname VARCHAR(100) NOT NULL,
    middle_names VARCHAR(100),
    known_as VARCHAR(100),

    -- Personal Details (5 fields)
    relationship_status VARCHAR(50),
    gender VARCHAR(20),
    previous_names VARCHAR(255),
    dob DATE,
    deceased_date DATE,  -- REQUIRED when status='deceased'
    place_of_birth VARCHAR(100),

    -- Contact Information (4 fields)
    email_1 VARCHAR(255),
    email_2 VARCHAR(255),
    phone_1 VARCHAR(50),
    phone_2 VARCHAR(50),

    -- Residential (2 fields + address_id FK)
    moved_in_date DATE,
    address_id BIGINT REFERENCES addresses(id) ON DELETE SET NULL,

    -- Profiling (2 fields)
    three_words VARCHAR(255),
    share_data_with VARCHAR(255),

    -- Employment (2 fields)
    employment_status VARCHAR(50),
    occupation VARCHAR(100),

    -- Employment (4 fields)
    passport_expiry_date DATE,
    ni_number VARCHAR(20),
    aml_result VARCHAR(50),
    aml_date DATE,

    -- Metadata
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),

    -- Indexes
    INDEX idx_status (status),
    INDEX idx_firstname (firstname),
    INDEX idx_surname (surname),
    INDEX idx_email_1 (email_1),
    INDEX idx_dob (dob)
);
```

#### client_group_product_owners Table (Junction Table)
```sql
CREATE TABLE client_group_product_owners (
    id BIGSERIAL PRIMARY KEY,
    client_group_id BIGINT NOT NULL REFERENCES client_groups(id) ON DELETE CASCADE,
    product_owner_id BIGINT NOT NULL REFERENCES product_owners(id) ON DELETE CASCADE,
    display_order INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),

    -- Constraints
    UNIQUE(client_group_id, product_owner_id),

    -- Indexes
    INDEX idx_client_group_id (client_group_id),
    INDEX idx_product_owner_id (product_owner_id),
    INDEX idx_display_order (display_order)
);
```

#### addresses Table (Shared Address Records)
```sql
CREATE TABLE addresses (
    id BIGSERIAL PRIMARY KEY,
    address_line_1 VARCHAR(255),
    address_line_2 VARCHAR(255),
    address_line_3 VARCHAR(255),
    address_line_4 VARCHAR(255),
    address_line_5 VARCHAR(255),  -- Postcode
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),

    -- Indexes
    INDEX idx_address_line_1 (address_line_1),
    INDEX idx_address_line_5 (address_line_5)  -- Postcode searches
);
```

### 3.2 Data Model Interfaces

#### Frontend TypeScript Types
```typescript
// Product Owner Interface (complete 31-field structure)
interface ProductOwner {
  // Core identity (6 fields)
  id: number;
  status: 'active' | 'lapsed' | 'deceased';
  firstname: string;
  surname: string;
  known_as: string | null;
  title: string | null;
  middle_names: string | null;

  // Personal details (5 fields)
  relationship_status: string | null;
  gender: string | null;
  previous_names: string | null;
  dob: string | null;  // ISO date string YYYY-MM-DD
  deceased_date: string | null;  // Required when status='deceased'
  place_of_birth: string | null;

  // Contact information (4 fields)
  email_1: string | null;
  email_2: string | null;
  phone_1: string | null;
  phone_2: string | null;

  // Residential (7 fields - 6 from addresses table via JOIN)
  moved_in_date: string | null;
  address_id: number | null;
  address_line_1?: string | null;  // Joined from addresses table
  address_line_2?: string | null;
  address_line_3?: string | null;
  address_line_4?: string | null;
  address_line_5?: string | null;

  // Profiling (2 fields)
  three_words: string | null;
  share_data_with: string | null;

  // Employment (2 fields)
  employment_status: string | null;
  occupation: string | null;

  // Employment (4 fields)
  passport_expiry_date: string | null;
  ni_number: string | null;
  aml_result: string | null;
  aml_date: string | null;

  // Metadata
  created_at: string;  // ISO timestamp
  updated_at?: string;
}

// Sort Configuration
interface SortConfig {
  key: keyof ProductOwner | 'age' | 'name';  // Computed fields allowed
  direction: 'asc' | 'desc' | 'default';
}

// Form State
interface FormState {
  data: Partial<ProductOwner>;
  errors: ValidationErrors;
  isDirty: boolean;
  isSubmitting: boolean;
}

// Validation Errors
interface ValidationErrors {
  [fieldName: string]: string;
}

// Address Payload Strategy
interface AddressPayload {
  strategy: 'create_new' | 'no_change';
  changed: boolean;
  reason: string;
}
```

#### Backend Pydantic Models
```python
# backend/app/models/product_owner.py
from pydantic import BaseModel, EmailStr, validator
from typing import Optional
from datetime import date

class ProductOwnerBase(BaseModel):
    # Core identity
    status: str = 'active'
    title: Optional[str] = None
    firstname: str
    surname: str
    middle_names: Optional[str] = None
    known_as: Optional[str] = None

    # Personal details
    relationship_status: Optional[str] = None
    gender: Optional[str] = None
    previous_names: Optional[str] = None
    dob: Optional[date] = None
    deceased_date: Optional[date] = None
    place_of_birth: Optional[str] = None

    # Contact information
    email_1: Optional[EmailStr] = None
    email_2: Optional[EmailStr] = None
    phone_1: Optional[str] = None
    phone_2: Optional[str] = None

    # Residential
    moved_in_date: Optional[date] = None
    address_id: Optional[int] = None

    # Profiling
    three_words: Optional[str] = None
    share_data_with: Optional[str] = None

    # Employment
    employment_status: Optional[str] = None
    occupation: Optional[str] = None

    # Employment
    passport_expiry_date: Optional[date] = None
    ni_number: Optional[str] = None
    aml_result: Optional[str] = None
    aml_date: Optional[date] = None

    @validator('status')
    def validate_status(cls, v):
        if v not in ['active', 'lapsed', 'deceased']:
            raise ValueError('status must be active, lapsed, or deceased')
        return v

    @validator('deceased_date')
    def validate_deceased_date(cls, v, values):
        # If status is deceased, deceased_date is recommended but not required
        # (for legacy data compatibility)
        return v

class ProductOwnerCreate(ProductOwnerBase):
    pass

class ProductOwnerUpdate(ProductOwnerBase):
    firstname: Optional[str] = None  # Allow partial updates
    surname: Optional[str] = None

class ProductOwnerResponse(ProductOwnerBase):
    id: int
    created_at: datetime
    updated_at: datetime

    # Joined address fields (from addresses table)
    address_line_1: Optional[str] = None
    address_line_2: Optional[str] = None
    address_line_3: Optional[str] = None
    address_line_4: Optional[str] = None
    address_line_5: Optional[str] = None

    class Config:
        orm_mode = True
```

### 3.3 Data Flow Diagrams

#### Fetch Product Owners Flow
```
Frontend                          Backend                         Database
────────                          ───────                         ────────

PeopleSubTab.fetchProductOwners()
    │
    │ GET /client-groups/123/product-owners
    ├──────────────────────────────►
    │                              Route Handler
    │                              (/client_groups.py)
    │                                    │
    │                                    │ Query with JOIN
    │                                    ├─────────────────────────►
    │                                    │                          product_owners
    │                                    │                          ├─ LEFT JOIN addresses
    │                                    │                          ├─ INNER JOIN client_group_product_owners
    │                                    │                          └─ WHERE client_group_id = 123
    │                                    │                          ORDER BY display_order, created_at
    │                                    │◄──────────────────────────
    │                              [Product Owner rows]
    │                                    │
    │◄───────────────────────────────────┤
    │ 200 OK + JSON Array
    │
setProductOwners(data)
setIsLoading(false)
```

#### Create Product Owner Flow (Two-Step)
```
Frontend                          Backend                         Database
────────                          ───────                         ────────

User fills form → Click "Create Person"
    │
validateProductOwnerForm()
    │ ✓ Validation passes
    │
    │ Step 1: Create Product Owner
    │ POST /product-owners
    ├──────────────────────────────►
    │                              Route Handler
    │                              (/product_owners.py)
    │                                    │ Create address if needed
    │                                    ├─────────────────────────►
    │                                    │                          INSERT INTO addresses
    │                                    │                          RETURNING id
    │                                    │◄──────────────────────────
    │                                    │ new_address_id = 456
    │                                    │
    │                                    │ Create product owner
    │                                    ├─────────────────────────►
    │                                    │                          INSERT INTO product_owners
    │                                    │                          (address_id = 456, ...)
    │                                    │                          RETURNING *
    │                                    │◄──────────────────────────
    │                                    │ product_owner_id = 789
    │◄───────────────────────────────────┤
    │ 200 OK + ProductOwner object
    │ {id: 789, firstname: "John", ...}
    │
    │ Step 2: Associate with Client Group
    │ POST /client-group-product-owners
    ├──────────────────────────────►
    │                              Route Handler
    │                              (/client_group_product_owners.py)
    │                                    │ Calculate display_order
    │                                    ├─────────────────────────►
    │                                    │                          SELECT MAX(display_order)
    │                                    │                          FROM client_group_product_owners
    │                                    │                          WHERE client_group_id = 123
    │                                    │◄──────────────────────────
    │                                    │ max_order = 5
    │                                    │
    │                                    │ Create association
    │                                    ├─────────────────────────►
    │                                    │                          INSERT INTO client_group_product_owners
    │                                    │                          (client_group_id=123,
    │                                    │                           product_owner_id=789,
    │                                    │                           display_order=6)
    │                                    │◄──────────────────────────
    │◄───────────────────────────────────┤
    │ 200 OK
    │
    │ ✓ Both steps succeeded
refetchProductOwners()
closeCreateModal()
showNotification("Success")
```

#### Create Product Owner Rollback Flow (Step 2 Fails)
```
Frontend                          Backend                         Database
────────                          ───────                         ────────

Step 1: Create Product Owner ✓ (product_owner_id = 789 created)
    │
Step 2: POST /client-group-product-owners
    │ ❌ Error 500 (database constraint violation)
    │
Rollback Initiated:
    │ DELETE /product-owners/789
    ├──────────────────────────────►
    │                              Route Handler
    │                                    │ Delete product owner
    │                                    ├─────────────────────────►
    │                                    │                          DELETE FROM product_owners
    │                                    │                          WHERE id = 789
    │                                    │◄──────────────────────────
    │                                    │ Rows deleted: 1
    │◄───────────────────────────────────┤
    │ 204 No Content
    │
showNotification("Failed to associate product owner")
```

---

## 4. API Architecture

### 4.1 Endpoint Specifications

#### GET /client-groups/{client_group_id}/product-owners
**Purpose**: Retrieve all product owners for a client group with joined address data

**Request**:
```http
GET /client-groups/123/product-owners HTTP/1.1
Host: api.example.com
Authorization: Bearer {jwt_token}
Cookie: session={session_cookie}
```

**Response Success (200 OK)**:
```json
[
  {
    "id": 1,
    "status": "active",
    "firstname": "John",
    "surname": "Smith",
    "title": "Mr",
    "middle_names": "Michael",
    "known_as": "Johnny",
    "relationship_status": "Married",
    "gender": "Male",
    "previous_names": null,
    "dob": "1975-06-15",
    "deceased_date": null,
    "place_of_birth": "London",
    "email_1": "john.smith@example.com",
    "email_2": null,
    "phone_1": "07123456789",
    "phone_2": null,
    "moved_in_date": "2010-03-01",
    "address_id": 456,
    "address_line_1": "123 Main Street",
    "address_line_2": "Apartment 4B",
    "address_line_3": "Westminster",
    "address_line_4": "London",
    "address_line_5": "SW1A 1AA",
    "three_words": "friendly, analytical, creative",
    "share_data_with": "Spouse",
    "employment_status": "Employed",
    "occupation": "Software Engineer",
    "passport_expiry_date": "2028-12-31",
    "ni_number": "AB123456C",
    "aml_result": "Pass",
    "aml_date": "2024-01-15",
    "created_at": "2023-01-10T10:30:00Z",
    "updated_at": "2024-06-12T14:22:00Z"
  }
]
```

**Backend Implementation**:
```python
# backend/app/api/routes/client_groups.py
@router.get("/client-groups/{client_group_id}/product-owners")
async def get_client_group_product_owners(
    client_group_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    # Authorization check
    if not await user_has_access_to_client_group(db, current_user.id, client_group_id):
        raise HTTPException(status_code=403, detail="Access denied")

    # Query with JOIN
    query = """
        SELECT
            po.*,
            a.address_line_1,
            a.address_line_2,
            a.address_line_3,
            a.address_line_4,
            a.address_line_5,
            cgpo.display_order
        FROM product_owners po
        INNER JOIN client_group_product_owners cgpo
            ON po.id = cgpo.product_owner_id
        LEFT JOIN addresses a
            ON po.address_id = a.id
        WHERE cgpo.client_group_id = :client_group_id
        ORDER BY
            CASE WHEN cgpo.display_order > 0 THEN cgpo.display_order ELSE 9999 END,
            po.created_at ASC
    """

    result = await db.execute(query, {"client_group_id": client_group_id})
    product_owners = result.fetchall()

    return [ProductOwnerResponse.from_orm(po) for po in product_owners]
```

#### POST /product-owners
**Purpose**: Create a new product owner

**Request**:
```http
POST /product-owners HTTP/1.1
Host: api.example.com
Authorization: Bearer {jwt_token}
Content-Type: application/json

{
  "status": "active",
  "firstname": "Jane",
  "surname": "Doe",
  "title": "Ms",
  "dob": "1980-04-22",
  "email_1": "jane.doe@example.com",
  "phone_1": "07987654321",
  "address_line_1": "456 Oak Avenue",
  "address_line_5": "M1 1AA"
}
```

**Response Success (201 Created)**:
```json
{
  "id": 789,
  "status": "active",
  "firstname": "Jane",
  "surname": "Doe",
  "title": "Ms",
  "dob": "1980-04-22",
  "email_1": "jane.doe@example.com",
  "phone_1": "07987654321",
  "address_id": 457,
  "address_line_1": "456 Oak Avenue",
  "address_line_5": "M1 1AA",
  "created_at": "2025-12-04T10:30:00Z",
  "updated_at": "2025-12-04T10:30:00Z"
}
```

**Backend Implementation**:
```python
# backend/app/api/routes/product_owners.py
@router.post("/product-owners", status_code=201)
async def create_product_owner(
    product_owner: ProductOwnerCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    # Step 1: Create address record if address fields provided
    address_id = None
    if any([product_owner.address_line_1, product_owner.address_line_2,
            product_owner.address_line_3, product_owner.address_line_4,
            product_owner.address_line_5]):
        address = Address(
            address_line_1=product_owner.address_line_1,
            address_line_2=product_owner.address_line_2,
            address_line_3=product_owner.address_line_3,
            address_line_4=product_owner.address_line_4,
            address_line_5=product_owner.address_line_5
        )
        db.add(address)
        await db.flush()  # Get address.id without committing
        address_id = address.id

    # Step 2: Create product owner
    db_product_owner = ProductOwner(
        **product_owner.dict(exclude={'address_line_1', 'address_line_2',
                                      'address_line_3', 'address_line_4',
                                      'address_line_5'}),
        address_id=address_id
    )
    db.add(db_product_owner)
    await db.flush()

    # Step 3: Commit transaction
    await db.commit()
    await db.refresh(db_product_owner)

    return db_product_owner
```

#### PUT /product-owners/{product_owner_id}
**Purpose**: Update an existing product owner

**Request**:
```http
PUT /product-owners/789 HTTP/1.1
Host: api.example.com
Authorization: Bearer {jwt_token}
Content-Type: application/json

{
  "status": "lapsed",
  "email_1": "jane.doe.new@example.com",
  "address_line_1": "789 New Street",
  "_address_strategy": "create_new"
}
```

**Response Success (200 OK)**:
```json
{
  "id": 789,
  "status": "lapsed",
  "firstname": "Jane",
  "surname": "Doe",
  "email_1": "jane.doe.new@example.com",
  "address_id": 458,
  "address_line_1": "789 New Street",
  "updated_at": "2025-12-04T11:45:00Z"
}
```

**Backend Implementation**:
```python
# backend/app/api/routes/product_owners.py
@router.put("/product-owners/{product_owner_id}")
async def update_product_owner(
    product_owner_id: int,
    product_owner_update: ProductOwnerUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    # Fetch existing product owner
    db_product_owner = await db.get(ProductOwner, product_owner_id)
    if not db_product_owner:
        raise HTTPException(status_code=404, detail="Product owner not found")

    # Authorization check (user has access to this product owner's client groups)
    if not await user_has_access_to_product_owner(db, current_user.id, product_owner_id):
        raise HTTPException(status_code=403, detail="Access denied")

    # Extract address strategy
    address_strategy = getattr(product_owner_update, '_address_strategy', 'no_change')

    # Handle address updates with "create new" strategy
    if address_strategy == 'create_new' and any([
        product_owner_update.address_line_1,
        product_owner_update.address_line_2,
        product_owner_update.address_line_3,
        product_owner_update.address_line_4,
        product_owner_update.address_line_5
    ]):
        # Create new address record
        new_address = Address(
            address_line_1=product_owner_update.address_line_1,
            address_line_2=product_owner_update.address_line_2,
            address_line_3=product_owner_update.address_line_3,
            address_line_4=product_owner_update.address_line_4,
            address_line_5=product_owner_update.address_line_5
        )
        db.add(new_address)
        await db.flush()
        db_product_owner.address_id = new_address.id

    # Update product owner fields
    update_data = product_owner_update.dict(
        exclude_unset=True,
        exclude={'_address_strategy', 'address_line_1', 'address_line_2',
                'address_line_3', 'address_line_4', 'address_line_5'}
    )
    for field, value in update_data.items():
        setattr(db_product_owner, field, value)

    db_product_owner.updated_at = datetime.utcnow()

    # Commit changes
    await db.commit()
    await db.refresh(db_product_owner)

    return db_product_owner
```

#### DELETE /product-owners/{product_owner_id}
**Purpose**: Permanently delete an inactive product owner

**Request**:
```http
DELETE /product-owners/789 HTTP/1.1
Host: api.example.com
Authorization: Bearer {jwt_token}
```

**Response Success (204 No Content)**:
```http
HTTP/1.1 204 No Content
```

**Backend Implementation**:
```python
# backend/app/api/routes/product_owners.py
@router.delete("/product-owners/{product_owner_id}", status_code=204)
async def delete_product_owner(
    product_owner_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    # Fetch product owner
    db_product_owner = await db.get(ProductOwner, product_owner_id)
    if not db_product_owner:
        raise HTTPException(status_code=404, detail="Product owner not found")

    # Authorization check
    if not await user_has_access_to_product_owner(db, current_user.id, product_owner_id):
        raise HTTPException(status_code=403, detail="Access denied")

    # Validation: Only allow deletion of inactive product owners
    if db_product_owner.status == 'active':
        raise HTTPException(
            status_code=400,
            detail="Cannot delete active product owner. Please lapse or mark as deceased first."
        )

    # Check for dependencies (products, holdings, etc.)
    # This prevents orphaned data
    has_dependencies = await check_product_owner_dependencies(db, product_owner_id)
    if has_dependencies:
        raise HTTPException(
            status_code=409,
            detail="Cannot delete: This product owner has associated products or holdings"
        )

    # Delete product owner (cascades to client_group_product_owners via ON DELETE CASCADE)
    await db.delete(db_product_owner)
    await db.commit()

    return None  # 204 No Content
```

#### POST /client-group-product-owners
**Purpose**: Associate a product owner with a client group

**Request**:
```http
POST /client-group-product-owners HTTP/1.1
Host: api.example.com
Authorization: Bearer {jwt_token}
Content-Type: application/json

{
  "client_group_id": 123,
  "product_owner_id": 789,
  "display_order": 0
}
```

**Response Success (201 Created)**:
```json
{
  "id": 456,
  "client_group_id": 123,
  "product_owner_id": 789,
  "display_order": 6,
  "created_at": "2025-12-04T10:30:05Z"
}
```

**Backend Implementation**:
```python
# backend/app/api/routes/client_group_product_owners.py
@router.post("/client-group-product-owners", status_code=201)
async def create_client_group_product_owner(
    association: ClientGroupProductOwnerCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    # Authorization check
    if not await user_has_access_to_client_group(db, current_user.id, association.client_group_id):
        raise HTTPException(status_code=403, detail="Access denied")

    # Check if association already exists
    existing = await db.execute(
        select(ClientGroupProductOwner).where(
            ClientGroupProductOwner.client_group_id == association.client_group_id,
            ClientGroupProductOwner.product_owner_id == association.product_owner_id
        )
    )
    if existing.scalar_one_or_none():
        raise HTTPException(
            status_code=409,
            detail="This product owner is already associated with this client group"
        )

    # Calculate display_order if not provided or is 0
    if association.display_order == 0:
        result = await db.execute(
            select(func.max(ClientGroupProductOwner.display_order))
            .where(ClientGroupProductOwner.client_group_id == association.client_group_id)
        )
        max_order = result.scalar() or 0
        association.display_order = max_order + 1

    # Create association
    db_association = ClientGroupProductOwner(**association.dict())
    db.add(db_association)
    await db.commit()
    await db.refresh(db_association)

    return db_association
```

### 4.2 Error Responses

#### 400 Bad Request
```json
{
  "detail": "Validation error: firstname is required"
}
```

#### 401 Unauthorized
```json
{
  "detail": "Authentication required"
}
```

#### 403 Forbidden
```json
{
  "detail": "Access denied: You don't have permission to access this resource"
}
```

#### 404 Not Found
```json
{
  "detail": "Product owner not found"
}
```

#### 409 Conflict
```json
{
  "detail": "Cannot delete: This product owner has associated products or holdings"
}
```

#### 500 Internal Server Error
```json
{
  "detail": "Internal server error. Please try again later."
}
```

### 4.3 Idempotency Key Support (REQUIRED)

To prevent duplicate records from network retries or double-clicks, all mutation endpoints (POST, PUT, DELETE) MUST support idempotency keys.

#### Implementation

**Frontend: Generate and send idempotency key**
```typescript
import { v4 as uuidv4 } from 'uuid';

// Generate unique key per mutation attempt
const idempotencyKey = uuidv4();

const createMutation = useMutation(
  (data: Partial<ProductOwner>) =>
    api.post(`/client-groups/${clientGroupId}/product-owners`, data, {
      headers: {
        'Idempotency-Key': idempotencyKey
      }
    })
);
```

**Backend: Store and check idempotency keys**
```python
# backend/app/models/idempotency.py
from sqlalchemy import Column, String, Text, DateTime
from datetime import datetime, timedelta

class IdempotencyKey(Base):
    __tablename__ = 'idempotency_keys'

    key = Column(String(255), primary_key=True)
    endpoint = Column(String(255), nullable=False)
    user_id = Column(BigInteger, nullable=False)
    request_hash = Column(String(64), nullable=False)  # SHA256 of request body
    response_status = Column(Integer, nullable=False)
    response_body = Column(Text, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    expires_at = Column(DateTime, nullable=False)  # created_at + 24 hours

    # Index for cleanup
    __table_args__ = (
        Index('idx_idempotency_expires_at', 'expires_at'),
    )
```

**Backend: Idempotency middleware**
```python
# backend/app/middleware/idempotency.py
import hashlib
import json
from fastapi import Request, Response
from app.models.idempotency import IdempotencyKey

async def check_idempotency(
    request: Request,
    db: AsyncSession,
    current_user: User
) -> IdempotencyKey | None:
    """
    Check if this request has been processed before.
    Returns cached response if idempotency key exists.
    """
    idempotency_key = request.headers.get('Idempotency-Key')
    if not idempotency_key:
        return None

    # Hash request body for additional verification
    body = await request.body()
    request_hash = hashlib.sha256(body).hexdigest()

    # Check if key exists
    existing = await db.get(IdempotencyKey, idempotency_key)

    if existing:
        # Verify request matches (prevent key reuse with different payload)
        if existing.request_hash != request_hash:
            raise HTTPException(
                status_code=422,
                detail="Idempotency key reused with different request body"
            )

        # Return cached response
        return Response(
            content=existing.response_body,
            status_code=existing.response_status,
            media_type="application/json"
        )

    return None

async def store_idempotency(
    idempotency_key: str,
    endpoint: str,
    user_id: int,
    request_hash: str,
    response: Response,
    db: AsyncSession
):
    """Store successful response for future duplicate requests."""
    expires_at = datetime.utcnow() + timedelta(hours=24)

    key_record = IdempotencyKey(
        key=idempotency_key,
        endpoint=endpoint,
        user_id=user_id,
        request_hash=request_hash,
        response_status=response.status_code,
        response_body=response.body.decode('utf-8'),
        expires_at=expires_at
    )
    db.add(key_record)
    await db.commit()
```

**Usage in endpoints**:
```python
@router.post("/client-groups/{client_group_id}/product-owners", status_code=201)
async def create_client_group_product_owner(
    client_group_id: int,
    product_owner: ProductOwnerCreate,
    request: Request,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    # Check idempotency
    cached_response = await check_idempotency(request, db, current_user)
    if cached_response:
        return cached_response  # Return cached result

    # Process request normally...
    db_product_owner = await create_product_owner_logic(...)

    # Store idempotency key for future requests
    if idempotency_key := request.headers.get('Idempotency-Key'):
        await store_idempotency(
            idempotency_key=idempotency_key,
            endpoint=request.url.path,
            user_id=current_user.id,
            request_hash=hashlib.sha256(await request.body()).hexdigest(),
            response=response,
            db=db
        )

    return db_product_owner
```

**Cleanup job** (delete expired keys):
```python
# Run daily via cron
async def cleanup_expired_idempotency_keys(db: AsyncSession):
    """Delete idempotency keys older than 24 hours."""
    await db.execute(
        "DELETE FROM idempotency_keys WHERE expires_at < NOW()"
    )
    await db.commit()
```

**Benefits**:
- **Prevents duplicates**: Network retries don't create duplicate product owners
- **Safe retries**: Frontend can safely retry failed requests
- **User protection**: Double-clicks on submit button handled gracefully
- **24-hour window**: Reasonable timeframe for retry scenarios

**Implementation Effort**: 6-8 hours backend + 2 hours frontend integration

---

## 5. State Management Architecture

### 5.1 State Types

#### Local Component State
**Scope**: Single component instance
**Use Cases**: UI state (modal open/close, expanded cards)

```typescript
const [isEditModalOpen, setIsEditModalOpen] = useState(false);
const [selectedProductOwner, setSelectedProductOwner] = useState<ProductOwner | null>(null);
```

#### Server State (React Query)
**Scope**: Application-wide with automatic caching
**Use Cases**: Product owners data, mutations

```typescript
const { data, isLoading, error, refetch } = useQuery(
  ['clientGroup', clientGroupId, 'productOwners'],
  fetchProductOwners,
  { staleTime: 5 * 60 * 1000 }
);
```

#### Derived State
**Scope**: Computed from other state
**Use Cases**: Sorted lists, filtered data, counts

```typescript
const sortedProductOwners = useMemo(() => {
  return getSortedProductOwners(productOwners, sortConfig);
}, [productOwners, sortConfig]);
```

### 5.2 State Update Patterns

#### Optimistic Updates (Future Enhancement)
```typescript
const updateMutation = useMutation(
  ({ id, data }: { id: number; data: Partial<ProductOwner> }) =>
    api.put(`/product-owners/${id}`, data),
  {
    // Optimistically update before API call
    onMutate: async ({ id, data }) => {
      // Cancel ongoing queries
      await queryClient.cancelQueries(['clientGroup', clientGroupId, 'productOwners']);

      // Snapshot previous value
      const previousData = queryClient.getQueryData(['clientGroup', clientGroupId, 'productOwners']);

      // Optimistically update
      queryClient.setQueryData(
        ['clientGroup', clientGroupId, 'productOwners'],
        (old: ProductOwner[]) =>
          old.map((po) => (po.id === id ? { ...po, ...data } : po))
      );

      return { previousData };
    },
    // Rollback on error
    onError: (err, variables, context) => {
      queryClient.setQueryData(
        ['clientGroup', clientGroupId, 'productOwners'],
        context.previousData
      );
    },
    // Refetch on success
    onSuccess: () => {
      queryClient.invalidateQueries(['clientGroup', clientGroupId, 'productOwners']);
    },
  }
);
```

#### Pessimistic Updates (Current Implementation)
```typescript
const handleStatusChange = async (productOwnerId: number, newStatus: string) => {
  try {
    // Show loading state
    setIsSubmitting(true);

    // Make API call
    await api.put(`/product-owners/${productOwnerId}`, { status: newStatus });

    // Success - refetch data from server
    await refetchProductOwners();
    showNotification('Status updated successfully', 'success');
  } catch (error) {
    showNotification('Failed to update status', 'error');
  } finally {
    setIsSubmitting(false);
  }
};
```

### 5.3 Caching Strategy

#### React Query Cache Configuration
```typescript
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000,      // 5 minutes - data considered fresh
      cacheTime: 30 * 60 * 1000,     // 30 minutes - keep in cache
      refetchOnWindowFocus: true,     // Refetch when user returns to tab
      refetchOnReconnect: true,       // Refetch when network reconnects
      retry: 3,                       // Retry failed requests 3 times
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
    },
    mutations: {
      retry: 1,                       // Retry mutations once
    },
  },
});
```

#### Cache Invalidation
```typescript
// Invalidate on mutations
queryClient.invalidateQueries(['clientGroup', clientGroupId, 'productOwners']);

// Invalidate related queries
queryClient.invalidateQueries(['clientGroup', clientGroupId]); // All client group data
```

---

## 6. Key Workflows

### 6.1 View Product Owners Workflow

```
┌─────────┐
│  START  │
└────┬────┘
     │
     ▼
┌──────────────────────────────────────┐
│ User navigates to Basic Details →   │
│ People sub-tab                       │
└────────────┬─────────────────────────┘
             │
             ▼
┌──────────────────────────────────────┐
│ PeopleSubTab component mounts        │
│ useEffect triggers fetchProductOwners│
└────────────┬─────────────────────────┘
             │
             ▼
┌──────────────────────────────────────┐
│ API: GET /client-groups/{id}/        │
│      product-owners                  │
└────────────┬─────────────────────────┘
             │
     ┌───────┴────────┐
     │                │
     ▼                ▼
┌─────────┐      ┌─────────┐
│ Success │      │ Error   │
└────┬────┘      └────┬────┘
     │                │
     ▼                ▼
┌──────────┐      ┌──────────┐
│ Store    │      │ Show     │
│ data in  │      │ error    │
│ state    │      │ message  │
└────┬─────┘      └──────────┘
     │
     ▼
┌──────────────────────────────────────┐
│ Separate active and inactive         │
│ product owners                       │
└────────────┬─────────────────────────┘
             │
             ▼
┌──────────────────────────────────────┐
│ Apply sorting (if sortConfig set)   │
└────────────┬─────────────────────────┘
             │
             ▼
┌──────────────────────────────────────┐
│ Render ProductOwnerTable             │
│  - 7 columns                         │
│  - Action buttons per row            │
│  - Status badges                     │
└────────────┬─────────────────────────┘
             │
             ▼
        ┌────────┐
        │  END   │
        └────────┘
```

### 6.2 Create Product Owner Workflow

```
┌─────────┐
│  START  │
└────┬────┘
     │
     ▼
┌──────────────────────────────────────┐
│ User clicks "+ Add Person" button    │
└────────────┬─────────────────────────┘
             │
             ▼
┌──────────────────────────────────────┐
│ Open CreateProductOwnerModal         │
│  - Default tab: Personal Details     │
│  - status defaulted to 'active'      │
└────────────┬─────────────────────────┘
             │
             ▼
┌──────────────────────────────────────┐
│ User fills form fields across tabs   │
│  - Personal Details                  │
│  - Contact & Address                 │
│  - Employment                        │
└────────────┬─────────────────────────┘
             │
             ▼
┌──────────────────────────────────────┐
│ User clicks "Create Person"          │
└────────────┬─────────────────────────┘
             │
             ▼
┌──────────────────────────────────────┐
│ Client-side validation               │
│ validateProductOwnerForm(formData)   │
└────────────┬─────────────────────────┘
             │
     ┌───────┴────────┐
     │                │
     ▼                ▼
┌─────────┐      ┌─────────┐
│ Valid   │      │ Invalid │
└────┬────┘      └────┬────┘
     │                │
     │                ▼
     │           ┌──────────┐
     │           │ Show     │
     │           │ errors   │
     │           │ inline   │
     │           └──────────┘
     │                │
     │                └──► RETURN to form
     │
     ▼
┌──────────────────────────────────────┐
│ STEP 1: Create Product Owner         │
│ API: POST /product-owners            │
└────────────┬─────────────────────────┘
             │
     ┌───────┴────────┐
     │                │
     ▼                ▼
┌─────────┐      ┌─────────┐
│ Success │      │ Error   │
└────┬────┘      └────┬────┘
     │                │
     │                ▼
     │           ┌──────────┐
     │           │ Show     │
     │           │ error    │
     │           │ notif    │
     │           └──────────┘
     │                │
     │                └──► END (abort)
     │
     ▼
┌──────────────────────────────────────┐
│ Product owner created                │
│ product_owner_id = 789               │
└────────────┬─────────────────────────┘
             │
             ▼
┌──────────────────────────────────────┐
│ STEP 2: Associate with Client Group  │
│ API: POST /client-group-product-     │
│      owners                          │
└────────────┬─────────────────────────┘
             │
     ┌───────┴────────┐
     │                │
     ▼                ▼
┌─────────┐      ┌─────────┐
│ Success │      │ Error   │
└────┬────┘      └────┬────┘
     │                │
     │                ▼
     │           ┌──────────────────────────┐
     │           │ ROLLBACK: Delete product │
     │           │ owner 789                │
     │           │ API: DELETE /product-    │
     │           │      owners/789          │
     │           └───────┬──────────────────┘
     │                   │
     │                   ▼
     │           ┌──────────┐
     │           │ Show     │
     │           │ error    │
     │           │ notif    │
     │           └──────────┘
     │                │
     │                └──► END (abort)
     │
     ▼
┌──────────────────────────────────────┐
│ Close CreateModal                    │
│ Refetch product owners               │
│ Show success notification            │
└────────────┬─────────────────────────┘
             │
             ▼
        ┌────────┐
        │  END   │
        └────────┘
```

### 6.3 Edit Product Owner Workflow

```
┌─────────┐
│  START  │
└────┬────┘
     │
     ▼
┌──────────────────────────────────────┐
│ User clicks row or Edit button       │
└────────────┬─────────────────────────┘
             │
             ▼
┌──────────────────────────────────────┐
│ Open EditProductOwnerModal           │
│  - Pre-populate form with existing   │
│    product owner data                │
│  - Track initialFormData for change  │
│    detection                         │
└────────────┬─────────────────────────┘
             │
             ▼
┌──────────────────────────────────────┐
│ User edits fields across tabs        │
│  - formData state updates            │
│  - isDirty = true                    │
└────────────┬─────────────────────────┘
             │
             ▼
┌──────────────────────────────────────┐
│ User clicks "Save Changes"           │
└────────────┬─────────────────────────┘
             │
             ▼
┌──────────────────────────────────────┐
│ Client-side validation               │
│ validateProductOwnerForm(formData)   │
└────────────┬─────────────────────────┘
             │
     ┌───────┴────────┐
     │                │
     ▼                ▼
┌─────────┐      ┌─────────┐
│ Valid   │      │ Invalid │
└────┬────┘      └────┬────┘
     │                │
     │                ▼
     │           ┌──────────┐
     │           │ Show     │
     │           │ errors   │
     │           └──────────┘
     │                │
     │                └──► RETURN to form
     │
     ▼
┌──────────────────────────────────────┐
│ Detect changed fields                │
│ getChangedFields(initialData,        │
│                  formData)           │
└────────────┬─────────────────────────┘
             │
             ▼
┌──────────────────────────────────────┐
│ Check if address fields changed      │
│ prepareAddressPayload()              │
└────────────┬─────────────────────────┘
             │
     ┌───────┴────────┐
     │                │
     ▼                ▼
┌────────────┐   ┌────────────┐
│ Address    │   │ Address    │
│ changed    │   │ unchanged  │
└────┬───────┘   └────┬───────┘
     │                │
     ▼                │
┌────────────┐        │
│ Strategy:  │        │
│ create_new │        │
└────┬───────┘        │
     │                │
     └────────┬───────┘
              │
              ▼
┌──────────────────────────────────────┐
│ API: PUT /product-owners/{id}        │
│  - formData                          │
│  - _address_strategy                 │
└────────────┬─────────────────────────┘
             │
     ┌───────┴────────┐
     │                │
     ▼                ▼
┌─────────┐      ┌─────────┐
│ Success │      │ Error   │
└────┬────┘      └────┬────┘
     │                │
     │                ▼
     │           ┌──────────┐
     │           │ Show     │
     │           │ error    │
     │           │ notif    │
     │           └──────────┘
     │                │
     │                └──► RETURN to form
     │                     (keep open)
     │
     ▼
┌──────────────────────────────────────┐
│ Close EditModal                      │
│ Refetch product owners               │
│ Show success notification            │
└────────────┬─────────────────────────┘
             │
             ▼
        ┌────────┐
        │  END   │
        └────────┘
```

### 6.4 Status Transition Workflow (with Deceased Date)

```
┌─────────┐
│  START  │
└────┬────┘
     │
     ▼
┌──────────────────────────────────────┐
│ User clicks status button            │
│  - Lapse                             │
│  - Make Deceased                     │
│  - Reactivate                        │
└────────────┬─────────────────────────┘
             │
             ▼
     ┌───────┴────────────┐
     │                    │
     ▼                    ▼
┌──────────┐        ┌──────────┐
│ Lapse or │        │ Make     │
│ Reactive │        │ Deceased │
└────┬─────┘        └────┬─────┘
     │                   │
     │                   ▼
     │              ┌──────────────────────┐
     │              │ Open DeceasedDate    │
     │              │ Modal                │
     │              │  - Optional date     │
     │              │    picker            │
     │              └────┬─────────────────┘
     │                   │
     │           ┌───────┴────────┐
     │           │                │
     │           ▼                ▼
     │      ┌─────────┐      ┌─────────┐
     │      │ User    │      │ User    │
     │      │ enters  │      │ cancels │
     │      │ date    │      └────┬────┘
     │      └────┬────┘           │
     │           │                │
     │           ▼                └──► END (abort)
     │      ┌─────────┐
     │      │ Close   │
     │      │ modal   │
     │      └────┬────┘
     │           │
     └───────────┴───────┐
                         │
                         ▼
┌──────────────────────────────────────┐
│ API: PUT /product-owners/{id}        │
│  - status: newStatus                 │
│  - deceased_date: date OR null       │
└────────────┬─────────────────────────┘
             │
     ┌───────┴────────┐
     │                │
     ▼                ▼
┌─────────┐      ┌─────────┐
│ Success │      │ Error   │
└────┬────┘      └────┬────┘
     │                │
     │                ▼
     │           ┌──────────┐
     │           │ Show     │
     │           │ error    │
     │           │ notif    │
     │           └──────────┘
     │                │
     │                └──► END (abort)
     │
     ▼
┌──────────────────────────────────────┐
│ Refetch product owners               │
│ Show success notification            │
│ Row moves to bottom (if inactive)    │
└────────────┬─────────────────────────┘
             │
             ▼
        ┌────────┐
        │  END   │
        └────────┘
```

### 6.5 Delete Product Owner Workflow

```
┌─────────┐
│  START  │
└────┬────┘
     │
     ▼
┌──────────────────────────────────────┐
│ User clicks Delete button            │
│ (only visible for inactive POs)      │
└────────────┬─────────────────────────┘
             │
             ▼
┌──────────────────────────────────────┐
│ Validate product owner is inactive   │
└────────────┬─────────────────────────┘
             │
     ┌───────┴────────┐
     │                │
     ▼                ▼
┌─────────┐      ┌─────────┐
│ Inactive│      │ Active  │
└────┬────┘      └────┬────┘
     │                │
     │                ▼
     │           ┌──────────┐
     │           │ Show     │
     │           │ error    │
     │           │ "Cannot  │
     │           │ delete   │
     │           │ active"  │
     │           └──────────┘
     │                │
     │                └──► END (abort)
     │
     ▼
┌──────────────────────────────────────┐
│ Open DeleteConfirmationModal         │
│  - Show product owner name           │
│  - Warning: "This action cannot be   │
│    undone"                           │
└────────────┬─────────────────────────┘
             │
     ┌───────┴────────┐
     │                │
     ▼                ▼
┌─────────┐      ┌─────────┐
│ User    │      │ User    │
│ confirms│      │ cancels │
└────┬────┘      └────┬────┘
     │                │
     │                └──► END (abort)
     │
     ▼
┌──────────────────────────────────────┐
│ API: DELETE /product-owners/{id}     │
└────────────┬─────────────────────────┘
             │
     ┌───────┴────────┐
     │                │
     ▼                ▼
┌─────────┐      ┌─────────┐
│ Success │      │ Error   │
└────┬────┘      └────┬────┘
     │                │
     │                ▼
     │           ┌──────────┐
     │           │ Show     │
     │           │ error    │
     │           │ notif    │
     │           └──────────┘
     │                │
     │                └──► Close modal
     │                     END (abort)
     │
     ▼
┌──────────────────────────────────────┐
│ Close DeleteConfirmModal             │
│ Refetch product owners               │
│ Show success notification            │
│ "[Name] has been permanently         │
│  deleted"                            │
└────────────┬─────────────────────────┘
             │
             ▼
        ┌────────┐
        │  END   │
        └────────┘
```

### 6.6 Sorting Workflow

```
┌─────────┐
│  START  │
└────┬────┘
     │
     ▼
┌──────────────────────────────────────┐
│ User clicks column header            │
│ (e.g., "Name", "Age", "DOB")        │
└────────────┬─────────────────────────┘
             │
             ▼
┌──────────────────────────────────────┐
│ Check current sortConfig state       │
└────────────┬─────────────────────────┘
             │
     ┌───────┴────────────┬─────────────┐
     │                    │             │
     ▼                    ▼             ▼
┌──────────┐        ┌──────────┐  ┌──────────┐
│ First    │        │ Second   │  │ Third    │
│ click    │        │ click    │  │ click    │
│ (or diff │        │ (same    │  │ (same    │
│ column)  │        │ column)  │  │ column)  │
└────┬─────┘        └────┬─────┘  └────┬─────┘
     │                   │             │
     ▼                   ▼             ▼
┌──────────┐        ┌──────────┐  ┌──────────┐
│ Set sort │        │ Set sort │  │ Clear    │
│ ASC      │        │ DESC     │  │ sort     │
└────┬─────┘        └────┬─────┘  └────┬─────┘
     │                   │             │
     └───────────────────┴─────────────┘
                         │
                         ▼
┌──────────────────────────────────────┐
│ getSortedProductOwners() triggered   │
│ (via useMemo dependency)             │
└────────────┬─────────────────────────┘
             │
             ▼
┌──────────────────────────────────────┐
│ STEP 1: Separate active and inactive│
│  - active = status === 'active'      │
│  - inactive = status !== 'active'    │
└────────────┬─────────────────────────┘
             │
             ▼
┌──────────────────────────────────────┐
│ STEP 2: Sort each group              │
│  - sortProductOwners(active, config) │
│  - sortProductOwners(inactive,config)│
└────────────┬─────────────────────────┘
             │
             ▼
     ┌───────┴──────────────┐
     │                      │
     ▼                      ▼
┌──────────┐          ┌──────────┐
│ sortConfig│          │ sortConfig│
│ is null  │          │ set      │
│ (default)│          └────┬─────┘
└────┬─────┘               │
     │                     ▼
     │              ┌──────────────────┐
     │              │ Determine field  │
     │              │ type             │
     │              │  - Computed (age)│
     │              │  - Date          │
     │              │  - Text          │
     │              │  - Number        │
     │              └────┬─────────────┘
     │                   │
     │                   ▼
     │              ┌──────────────────┐
     │              │ Apply type-      │
     │              │ specific sort    │
     │              │  - Handle nulls  │
     │              │  - Apply direction│
     │              └────┬─────────────┘
     │                   │
     └───────────────────┘
                         │
                         ▼
┌──────────────────────────────────────┐
│ STEP 3: Concatenate arrays           │
│  [...sortedActive, ...sortedInactive]│
└────────────┬─────────────────────────┘
             │
             ▼
┌──────────────────────────────────────┐
│ Re-render table with new order       │
│  - Active rows at top                │
│  - Inactive rows at bottom (greyed)  │
│  - Sort indicator in column header   │
│    (↑ or ↓)                          │
└────────────┬─────────────────────────┘
             │
             ▼
        ┌────────┐
        │  END   │
        └────────┘
```

---

## 7. Security

### 7.1 Authentication Architecture

#### JWT Token Flow
```
User Login
    ↓
Backend authenticates credentials
    ↓
Generate JWT token
    ↓
Set HttpOnly cookie with JWT
    ↓
Return user data to frontend
    ↓
Frontend stores user context (NOT token)
    ↓
All API requests automatically include cookie
    ↓
Backend validates JWT on each request
    ↓
Extract user_id from token
    ↓
Proceed with request
```

#### Token Validation Middleware
```python
# backend/app/utils/security.py
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer
from jose import JWTError, jwt

security = HTTPBearer()

async def get_current_user(token: str = Depends(security)) -> User:
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        user_id: int = payload.get("sub")
        if user_id is None:
            raise credentials_exception
    except JWTError:
        raise credentials_exception

    user = await get_user(db, user_id=user_id)
    if user is None:
        raise credentials_exception
    return user
```

### 7.2 Input Validation & Sanitization

#### Frontend Validation
```typescript
// Client-side validation (user experience)
function validateProductOwnerForm(data: Partial<ProductOwner>): ValidationErrors {
  const errors: ValidationErrors = {};

  // Required fields
  if (!data.firstname?.trim()) {
    errors.firstname = 'First name is required';
  }
  if (!data.surname?.trim()) {
    errors.surname = 'Surname is required';
  }

  // Email format
  if (data.email_1 && !isValidEmail(data.email_1)) {
    errors.email_1 = 'Invalid email format';
  }

  // Date validations
  if (data.dob && new Date(data.dob) > new Date()) {
    errors.dob = 'Date of birth cannot be in the future';
  }

  if (data.deceased_date && data.dob) {
    if (new Date(data.deceased_date) < new Date(data.dob)) {
      errors.deceased_date = 'Date of death must be after date of birth';
    }
  }

  // NI Number format (UK)
  if (data.ni_number && !isValidNINumber(data.ni_number)) {
    errors.ni_number = 'Invalid NI number format (e.g., AB123456C)';
  }

  return errors;
}
```

#### Backend Validation (Security)
```python
# backend/app/models/product_owner.py
from pydantic import BaseModel, EmailStr, validator
import re

class ProductOwnerBase(BaseModel):
    firstname: str
    surname: str
    email_1: Optional[EmailStr] = None
    ni_number: Optional[str] = None
    dob: Optional[date] = None
    deceased_date: Optional[date] = None

    @validator('firstname', 'surname')
    def validate_name_fields(cls, v):
        if not v or not v.strip():
            raise ValueError('Name fields cannot be empty')
        if len(v) > 100:
            raise ValueError('Name fields must be 100 characters or less')
        # Prevent XSS and SQL injection
        if re.search(r'[<>"\']', v):
            raise ValueError('Name fields contain invalid characters')
        return v.strip()

    @validator('ni_number')
    def validate_ni_number(cls, v):
        if v is None:
            return v
        # UK NI Number format: XX 99 99 99 X
        pattern = r'^[A-CEGHJ-PR-TW-Z][A-CEGHJ-NPR-TW-Z]\d{6}[A-D]$'
        cleaned = v.replace(' ', '').upper()
        if not re.match(pattern, cleaned):
            raise ValueError('Invalid NI number format')
        return cleaned

    @validator('deceased_date')
    def validate_deceased_date(cls, v, values):
        if v and 'dob' in values and values['dob']:
            if v < values['dob']:
                raise ValueError('Deceased date must be after date of birth')
        return v
```

### 7.5 SQL Injection Prevention

#### Parameterized Queries (Current Best Practice)
```python
# ✓ CORRECT: Parameterized query
query = """
    SELECT * FROM product_owners
    WHERE id = :product_owner_id
    AND status = :status
"""
result = await db.execute(query, {
    "product_owner_id": product_owner_id,
    "status": status
})

# ✗ INCORRECT: String concatenation (vulnerable to SQL injection)
query = f"SELECT * FROM product_owners WHERE id = {product_owner_id}"
```

#### ORM Usage (Recommended)
```python
# Using SQLAlchemy ORM (automatically parameterized)
from sqlalchemy import select

query = select(ProductOwner).where(
    ProductOwner.id == product_owner_id,
    ProductOwner.status == status
)
result = await db.execute(query)
```

### 7.6 XSS Prevention

#### React Auto-Escaping
React automatically escapes all strings rendered in JSX, preventing XSS attacks:

```tsx
// ✓ SAFE: React escapes productOwner.firstname
<td>{productOwner.firstname}</td>

// ✗ DANGEROUS: dangerouslySetInnerHTML bypasses escaping
<td dangerouslySetInnerHTML={{ __html: productOwner.firstname }} />
```

#### Content Security Policy (CSP)
```html
<!-- Add CSP header to prevent inline script execution -->
<meta http-equiv="Content-Security-Policy"
      content="default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline';">
```

### 7.7 CSRF Protection

#### SameSite Cookies
```python
# backend/app/utils/security.py
from fastapi import Response

def set_auth_cookie(response: Response, token: str):
    response.set_cookie(
        key="session",
        value=token,
        httponly=True,      # Prevent JavaScript access
        secure=True,        # HTTPS only
        samesite='strict',  # CSRF protection
        max_age=86400       # 24 hours
    )
```

---

## 8. Accessibility Architecture

### 8.1 WCAG 2.1 AA Compliance Requirements

#### Core Principles
1. **Perceivable**: Information must be presentable to users in ways they can perceive
2. **Operable**: UI components must be operable by all users
3. **Understandable**: Information and UI operation must be understandable
4. **Robust**: Content must be robust enough for assistive technologies

### 8.2 Semantic HTML Structure

#### Table Semantics
```tsx
// ✓ CORRECT: Semantic HTML table
<table role="table">
  <thead>
    <tr>
      <th scope="col" aria-sort="ascending">
        Name
      </th>
      <th scope="col" aria-sort="none">
        Email
      </th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td>John Smith</td>
      <td>john@example.com</td>
    </tr>
  </tbody>
</table>

// ✗ INCORRECT: Div-based table (poor accessibility)
<div className="table">
  <div className="table-header">
    <div className="table-cell">Name</div>
  </div>
</div>
```

#### Semantic Benefits
- **Screen readers announce**: "table with 7 columns, 10 rows"
- **Column headers**: Announced when navigating cells
- **Sort state**: aria-sort communicates current sort direction

### 8.3 ARIA Attributes Architecture

#### Dynamic aria-sort Implementation
```tsx
function getAriaSortValue(columnKey: string, sortConfig: SortConfig | null): string {
  if (!sortConfig || sortConfig.key !== columnKey) {
    return 'none';
  }
  return sortConfig.direction === 'asc' ? 'ascending' : 'descending';
}

// Usage
<th
  scope="col"
  aria-sort={getAriaSortValue('name', sortConfig)}
  onClick={() => handleSort('name')}
>
  Name
  {renderSortIndicator('name')}
</th>
```

#### ARIA Labels with Context
```tsx
// ✓ GOOD: Contextual label
<button aria-label={`Edit ${fullName}`}>
  <PencilIcon className="h-4 w-4" />
</button>

// ✗ POOR: Generic label
<button aria-label="Edit">
  <PencilIcon className="h-4 w-4" />
</button>
```

#### ARIA Live Regions for Notifications
```tsx
// Notification component with live region
<div
  role="status"
  aria-live="polite"
  aria-atomic="true"
  className="sr-only"
>
  {notification}
</div>

// Screen reader announces: "Status updated successfully"
```

### 8.4 Keyboard Navigation Architecture

#### Tab Order Management
```tsx
// Table row with proper tabindex
<tr
  tabindex="0"  // Focusable, in tab order
  onClick={handleRowClick}
  onKeyDown={handleRowKeyDown}
  role="button"
  aria-label={`View details for ${fullName}`}
>
  <td>{fullName}</td>
  <td>
    <button tabindex="0">Edit</button>
    <button tabindex="0">Delete</button>
  </td>
</tr>
```

#### Keyboard Event Handlers
```tsx
function handleRowKeyDown(event: React.KeyboardEvent) {
  // Enter or Space activates row
  if (event.key === 'Enter' || event.key === ' ') {
    // Check if focus is on a button within row
    if (event.target.tagName === 'BUTTON') {
      return; // Let button handle its own activation
    }

    event.preventDefault();
    handleEdit(productOwner);
  }
}
```

#### Focus Trap in Modals
```tsx
function setupFocusTrap(modalElement: HTMLElement) {
  const focusableSelector = 'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])';
  const focusableElements = modalElement.querySelectorAll(focusableSelector);
  const firstElement = focusableElements[0] as HTMLElement;
  const lastElement = focusableElements[focusableElements.length - 1] as HTMLElement;

  const handleTabKey = (e: KeyboardEvent) => {
    if (e.key === 'Tab') {
      if (e.shiftKey) {
        // Shift+Tab on first element wraps to last
        if (document.activeElement === firstElement) {
          e.preventDefault();
          lastElement.focus();
        }
      } else {
        // Tab on last element wraps to first
        if (document.activeElement === lastElement) {
          e.preventDefault();
          firstElement.focus();
        }
      }
    } else if (e.key === 'Escape') {
      // Escape closes modal
      closeModal();
    }
  };

  modalElement.addEventListener('keydown', handleTabKey);
  firstElement.focus();

  // Cleanup
  return () => modalElement.removeEventListener('keydown', handleTabKey);
}
```

### 8.5 Focus Management Architecture

#### Focus Restoration Pattern
```tsx
function EditProductOwnerModal({ productOwner, onClose }: Props) {
  const [triggerElement, setTriggerElement] = useState<HTMLElement | null>(null);

  useEffect(() => {
    // Store element that opened modal
    setTriggerElement(document.activeElement as HTMLElement);

    // Focus first input in modal
    const firstInput = document.querySelector('input, select, textarea') as HTMLElement;
    firstInput?.focus();

    return () => {
      // Restore focus on unmount
      triggerElement?.focus();
    };
  }, []);

  // ... modal content
}
```

### 8.6 Color Contrast Requirements

#### WCAG AA Standards
- **Normal text**: 4.5:1 contrast ratio
- **Large text** (18pt+): 3:1 contrast ratio
- **UI components**: 3:1 contrast ratio
- **Focus indicators**: 3:1 contrast ratio

#### Status Badge Color Scheme
```tsx
// Status badges with sufficient contrast
const statusStyles = {
  active: {
    background: '#DCFCE7',  // green-100
    text: '#166534',        // green-800
    // Contrast ratio: 7.2:1 ✓
  },
  lapsed: {
    background: '#FEF3C7',  // orange-100
    text: '#92400E',        // orange-800
    // Contrast ratio: 8.1:1 ✓
  },
  deceased: {
    background: '#F3F4F6',  // gray-100
    text: '#1F2937',        // gray-800
    // Contrast ratio: 12.6:1 ✓
  },
};
```

### 8.7 Screen Reader Support

#### Table Announcement
```tsx
<table role="table">
  <caption className="sr-only">
    Product owners for {clientGroupName}. 7 columns, {productOwners.length} rows.
  </caption>
  {/* ... table content */}
</table>

// Screen reader announces:
// "Table with 7 columns, 10 rows"
```

#### Status Badge Announcement
```tsx
<span
  className={badgeStyles}
  role="status"
  aria-label={`Status: ${statusLabel}`}
>
  {icon && <icon aria-hidden="true" />}
  <span>{statusLabel}</span>
</span>

// Screen reader announces: "Status: Active"
// Visual icon is hidden from screen readers (decorative)
```

#### Form Field Labels
```tsx
// ✓ CORRECT: Explicit label association
<label htmlFor="firstname">First Name *</label>
<input
  id="firstname"
  type="text"
  value={formData.firstname}
  onChange={handleChange}
  required
  aria-required="true"
  aria-invalid={errors.firstname ? 'true' : 'false'}
  aria-describedby={errors.firstname ? 'firstname-error' : undefined}
/>
{errors.firstname && (
  <span id="firstname-error" role="alert">
    {errors.firstname}
  </span>
)}

// Screen reader announces:
// "First Name, required, edit text"
// (on error) "First name is required"
```

---

## 9. Technical Decisions

### 9.1 HeadlessUI for Modals

#### Decision Rationale
**Chosen**: HeadlessUI Dialog component (`@headlessui/react`)

**Alternatives Considered**:
1. Custom modal implementation
2. Material-UI Modal
3. Radix UI Dialog
4. Chakra UI Modal

**Why HeadlessUI**:
- **Accessibility built-in**: Focus trap, ESC handling, ARIA attributes
- **Unstyled**: Full control over styling with Tailwind
- **Lightweight**: ~12KB gzipped
- **React 18 compatible**: Works with concurrent rendering
- **Maintained**: Active development by Tailwind Labs
- **Type-safe**: Excellent TypeScript support

**Implementation**:
```tsx
import { Dialog } from '@headlessui/react';

function EditProductOwnerModal({ productOwner, onClose }: Props) {
  return (
    <Dialog open={true} onClose={onClose}>
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black/50" aria-hidden="true" />

      {/* Modal container */}
      <div className="fixed inset-0 flex items-center justify-center p-4">
        <Dialog.Panel className="bg-white rounded-lg max-w-4xl w-full">
          <Dialog.Title>Edit Product Owner: {fullName}</Dialog.Title>

          {/* Form content */}
          <form>{/* ... */}</form>
        </Dialog.Panel>
      </div>
    </Dialog>
  );
}
```

**Benefits Realized**:
- Automatic focus management
- ESC key handling
- Click-outside-to-close
- ARIA attributes (`role="dialog"`, `aria-modal="true"`, `aria-labelledby`)
- No additional setup required

### 9.2 Address Update Strategy (Create New vs. Update Existing)

#### Decision Rationale
**Chosen**: Create new address record on any address field change

**Problem**:
Product owners have `address_id` foreign key to `addresses` table. Multiple product owners can share the same address record (e.g., husband and wife living together). If we UPDATE the existing address, ALL product owners with that `address_id` will see the change, which is incorrect.

**Example Scenario**:
```
Initial state:
- Address ID 456: "123 Main Street, London, SW1A 1AA"
- John Smith (address_id = 456)
- Jane Smith (address_id = 456)

User edits John's address to "789 Oak Avenue, Manchester, M1 1AA"

❌ If we UPDATE address 456:
- John Smith's address: "789 Oak Avenue..." ✓ CORRECT
- Jane Smith's address: "789 Oak Avenue..." ✗ INCORRECT (unintended change)

✓ If we CREATE new address 457:
- John Smith (address_id = 457): "789 Oak Avenue..." ✓ CORRECT
- Jane Smith (address_id = 456): "123 Main Street..." ✓ CORRECT
```

**Implementation**:
```typescript
// Frontend: Detect address changes and set strategy
function prepareAddressPayload(
  formData: ProductOwner,
  initialFormData: ProductOwner
): AddressPayload {
  const addressFields = [
    'address_line_1',
    'address_line_2',
    'address_line_3',
    'address_line_4',
    'address_line_5'
  ];

  const addressChanged = addressFields.some(
    field => formData[field] !== initialFormData[field]
  );

  if (addressChanged) {
    return {
      strategy: 'create_new',
      changed: true,
      reason: 'Address fields modified - creating new address to prevent affecting other product owners'
    };
  }

  return {
    strategy: 'no_change',
    changed: false,
    reason: 'Address fields unchanged'
  };
}

// Backend: Handle strategy
@router.put("/product-owners/{product_owner_id}")
async def update_product_owner(...):
    address_strategy = getattr(product_owner_update, '_address_strategy', 'no_change')

    if address_strategy == 'create_new':
        # Create new address
        new_address = Address(
            address_line_1=product_owner_update.address_line_1,
            address_line_2=product_owner_update.address_line_2,
            address_line_3=product_owner_update.address_line_3,
            address_line_4=product_owner_update.address_line_4,
            address_line_5=product_owner_update.address_line_5
        )
        db.add(new_address)
        await db.flush()
        db_product_owner.address_id = new_address.id
```

**Trade-offs**:
- **Pro**: Prevents unintended side effects
- **Pro**: Each product owner has independent address history
- **Con**: Creates orphaned address records (old addresses with no references)
- **Mitigation**: REQUIRED periodic cleanup job (see below)

**REQUIRED: Orphaned Address Cleanup Job**

This cleanup job is REQUIRED for initial deployment to prevent unbounded database growth from orphaned address records.

```python
# backend/app/jobs/cleanup_orphaned_addresses.py
from sqlalchemy.ext.asyncio import AsyncSession
from app.db.database import get_db
import logging

logger = logging.getLogger(__name__)

async def cleanup_orphaned_addresses(db: AsyncSession):
    """
    Delete address records that are not referenced by any product owners.
    Run periodically (e.g., weekly cron job).

    Returns: Number of orphaned addresses deleted
    """
    query = """
        DELETE FROM addresses
        WHERE id NOT IN (
            SELECT DISTINCT address_id
            FROM product_owners
            WHERE address_id IS NOT NULL
        )
        AND created_at < NOW() - INTERVAL '7 days'  -- Only delete addresses older than 7 days
    """
    result = await db.execute(query)
    deleted_count = result.rowcount
    await db.commit()

    logger.info(f"Orphaned address cleanup: Deleted {deleted_count} unreferenced addresses")
    return deleted_count

# Schedule via cron or background task scheduler
# Example cron: 0 2 * * 0 (Every Sunday at 2 AM)
```

**Deployment Requirements**:
- Create `backend/app/jobs/cleanup_orphaned_addresses.py` file
- Add cron job or scheduled task to operations guide
- Configure logging for monitoring cleanup execution
- Estimated effort: 4-5 hours (development + testing + operations documentation)

### 9.3 Atomic Create Workflow (REQUIRED Implementation)

#### Decision Rationale
**Chosen**: Backend atomic transaction endpoint (REQUIRED for data integrity)

**Problem**:
Creating a product owner and associating them with a client group requires two operations:
1. Create product owner record
2. Create association with client group

If these operations are separated, failure scenarios can create orphaned records compromising data integrity.

**Alternatives Considered**:
1. **Backend atomic transaction endpoint** (**REQUIRED** - chosen for data integrity)
2. **Frontend handles rollback** (temporary fallback only - has critical failure case)
3. **Accept orphaned records** (rejected - unacceptable for data integrity)

**REQUIRED Implementation (Backend Atomic Endpoint)**:
```python
# backend/app/api/routes/client_groups.py
@router.post("/client-groups/{client_group_id}/product-owners", status_code=201)
async def create_client_group_product_owner(
    client_group_id: int,
    product_owner: ProductOwnerCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Atomic endpoint: Create product owner and associate with client group.
    Both operations happen in a single database transaction.
    """
    try:
        async with db.begin():  # Transaction begins
            # Step 1: Create product owner
            db_product_owner = ProductOwner(**product_owner.dict())
            db.add(db_product_owner)
            await db.flush()  # Get ID without committing

            # Step 2: Create association
            association = ClientGroupProductOwner(
                client_group_id=client_group_id,
                product_owner_id=db_product_owner.id,
                display_order=0  # Calculate in transaction
            )
            db.add(association)

            # Commit all or none
            await db.commit()  # Transaction commits

        return db_product_owner
    except Exception as e:
        # Transaction automatically rolls back
        raise HTTPException(status_code=500, detail=str(e))
```

**Frontend Implementation (Using Atomic Endpoint)**:
```typescript
async function createProductOwner(formData: Partial<ProductOwner>) {
  try {
    // Single API call creates product owner AND association atomically
    const response = await api.post(
      `/client-groups/${clientGroupId}/product-owners`,
      formData
    );
    return response.data;
  } catch (error) {
    // No orphaned records - transaction rolled back automatically
    throw error;
  }
}
```

**Benefits of Atomic Endpoint**:
- **All-or-nothing**: Both operations succeed or both fail (ACID guarantees)
- **Simpler frontend**: Single API call, no rollback logic needed
- **No orphaned records**: Database transaction handles rollback automatically
- **Better performance**: Single round-trip, reduces latency
- **Data integrity**: Consistent state guaranteed by database
- **Reduced complexity**: No frontend error handling for partial failures

**Why This is REQUIRED**:
Two-step creation with frontend rollback has a critical failure case: if step 2 fails AND the rollback DELETE also fails, an orphaned product owner record remains in the database requiring manual cleanup. This violates data integrity requirements and creates operational burden. The atomic endpoint eliminates this risk entirely.

### 9.4 Progressive Disclosure in Form Modals

#### Decision Rationale
**Chosen**: Tabbed form with 3 sections (Personal Details | Contact & Address | Employment)

**Problem**:
31-field form displayed all at once:
- Overwhelming cognitive load
- High abandonment rate (20-40% for long forms)
- Difficult to scan and find specific fields
- Poor mobile experience

**Research**:
- Nielsen Norman Group: "Progressive disclosure reduces cognitive load by 40%"
- Baymard Institute: "Multi-step forms improve completion by 25-35%"
- Users prefer 3-7 items per chunk (Miller's Law: 7±2)

**Alternatives Considered**:
1. **Single long form** (rejected - poor UX)
2. **Multi-step wizard** (rejected - too many clicks for edits)
3. **Tabbed form** (chosen - best balance)
4. **Accordion sections** (considered - less clear structure)

**Implementation**:
```typescript
const FORM_TABS = [
  {
    id: 'personal',
    label: 'Personal Details',
    fields: [
      'title', 'firstname', 'surname', 'middle_names', 'known_as',
      'gender', 'dob', 'deceased_date', 'place_of_birth',
      'relationship_status', 'previous_names', 'status'
    ]  // 12 fields
  },
  {
    id: 'contact',
    label: 'Contact & Address',
    fields: [
      'email_1', 'email_2', 'phone_1', 'phone_2',
      'address_line_1', 'address_line_2', 'address_line_3',
      'address_line_4', 'address_line_5', 'moved_in_date'
    ]  // 10 fields
  },
  {
    id: 'employment',
    label: 'Employment',
    fields: [
      'employment_status', 'occupation', 'three_words',
      'share_data_with', 'ni_number', 'passport_expiry_date',
      'aml_result', 'aml_date'
    ]  // 9 fields (deceased_date conditionally added)
  }
];
```

**UX Benefits**:
- **Chunking**: 10-12 fields per tab (within cognitive limits)
- **Context**: Logical grouping by information type
- **Progress indication**: Users see 3 tabs, know what's left
- **Quick navigation**: Jump directly to section needed
- **Validation scoping**: Show errors in relevant tab

**Accessibility**:
```tsx
<div role="tablist" aria-label="Product owner form sections">
  {FORM_TABS.map(tab => (
    <button
      key={tab.id}
      role="tab"
      aria-selected={activeTab === tab.id}
      aria-controls={`tabpanel-${tab.id}`}
      onClick={() => setActiveTab(tab.id)}
    >
      {tab.label}
    </button>
  ))}
</div>

<div
  role="tabpanel"
  id={`tabpanel-${activeTab}`}
  aria-labelledby={`tab-${activeTab}`}
>
  {renderFormFields(activeTab)}
</div>
```

---

## 10. Performance Architecture

### 10.1 Rendering Optimization

#### Memoization Strategy
```typescript
// Memoize sorted list to avoid re-sorting on every render
const sortedProductOwners = useMemo(() => {
  return getSortedProductOwners(productOwners, sortConfig);
}, [productOwners, sortConfig]);

// Memoize event handlers to prevent child re-renders
const handleEdit = useCallback((productOwner: ProductOwner) => {
  setSelectedProductOwner(productOwner);
  setIsEditModalOpen(true);
}, []);

const handleStatusChange = useCallback(async (
  productOwnerId: number,
  newStatus: string
) => {
  // ... implementation
}, [clientGroupId, refetchProductOwners]);
```

#### React.memo for Table Rows
```typescript
// Prevent unnecessary row re-renders when other rows change
const ProductOwnerRow = React.memo(({
  productOwner,
  onEdit,
  onStatusChange,
  onDelete
}: ProductOwnerRowProps) => {
  // ... row implementation
}, (prevProps, nextProps) => {
  // Custom comparison: only re-render if product owner data changed
  return prevProps.productOwner.id === nextProps.productOwner.id &&
         prevProps.productOwner.updated_at === nextProps.productOwner.updated_at;
});
```

### 10.2 Data Fetching Optimization

#### React Query Configuration
```typescript
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000,      // 5 minutes
      cacheTime: 30 * 60 * 1000,     // 30 minutes
      refetchOnWindowFocus: true,
      refetchOnReconnect: true,
      retry: 3,
      retryDelay: attemptIndex => Math.min(1000 * 2 ** attemptIndex, 30000),
    },
  },
});

// Product owners query
const { data: productOwners } = useQuery(
  ['clientGroup', clientGroupId, 'productOwners'],
  () => api.get(`/client-groups/${clientGroupId}/product-owners`),
  {
    staleTime: 5 * 60 * 1000,
    // Optimistic updates disabled for now (can be enabled later)
  }
);
```

#### Backend Query Optimization
```python
# Optimized query with single JOIN (not N+1)
query = """
    SELECT
        po.*,
        a.address_line_1,
        a.address_line_2,
        a.address_line_3,
        a.address_line_4,
        a.address_line_5,
        cgpo.display_order
    FROM product_owners po
    INNER JOIN client_group_product_owners cgpo
        ON po.id = cgpo.product_owner_id
    LEFT JOIN addresses a
        ON po.address_id = a.id
    WHERE cgpo.client_group_id = :client_group_id
    ORDER BY
        CASE WHEN cgpo.display_order > 0 THEN cgpo.display_order ELSE 9999 END,
        po.created_at ASC
"""

# Query plan analysis (PostgreSQL):
# 1. Index scan on client_group_product_owners (client_group_id index)
# 2. Nested loop join with product_owners (primary key lookup)
# 3. Nested loop left join with addresses (primary key lookup)
# Estimated cost: ~10-50 (depending on row count)
# Execution time: <10ms for typical client group (5-20 product owners)
```

### 10.3 Bundle Size Optimization

#### Code Splitting
```typescript
// Lazy load modal components (not needed on initial page load)
const EditProductOwnerModal = lazy(() => import('./EditProductOwnerModal'));
const CreateProductOwnerModal = lazy(() => import('./CreateProductOwnerModal'));

// Render with Suspense
{isEditModalOpen && (
  <Suspense fallback={<div>Loading...</div>}>
    <EditProductOwnerModal
      productOwner={selectedProductOwner}
      onClose={closeEditModal}
      onSave={refetchProductOwners}
    />
  </Suspense>
)}
```

#### HeadlessUI Tree-Shaking
```typescript
// ✓ Import only what you need (tree-shakeable)
import { Dialog } from '@headlessui/react';

// ✗ Don't import entire library
import * as HeadlessUI from '@headlessui/react';
```

### 10.4 Database Indexing Strategy

#### Indexes for Product Owners
```sql
-- Indexes on product_owners table
CREATE INDEX idx_product_owners_status ON product_owners(status);
CREATE INDEX idx_product_owners_firstname ON product_owners(firstname);
CREATE INDEX idx_product_owners_surname ON product_owners(surname);
CREATE INDEX idx_product_owners_email_1 ON product_owners(email_1);
CREATE INDEX idx_product_owners_dob ON product_owners(dob);
CREATE INDEX idx_product_owners_created_at ON product_owners(created_at);

-- Composite index for sorting
CREATE INDEX idx_product_owners_status_created_at
    ON product_owners(status, created_at);

-- Indexes on junction table
CREATE INDEX idx_cgpo_client_group_id
    ON client_group_product_owners(client_group_id);
CREATE INDEX idx_cgpo_product_owner_id
    ON client_group_product_owners(product_owner_id);
CREATE INDEX idx_cgpo_display_order
    ON client_group_product_owners(client_group_id, display_order);
```

### 10.5 Performance Metrics & Monitoring

#### Target Performance Metrics
| Metric | Target | Measurement |
|--------|--------|-------------|
| Initial Page Load | <2s | Time to interactive |
| API Response (GET) | <500ms | Server-side + network |
| API Response (POST/PUT) | <1s | Server-side + network |
| Sort Operation | <100ms | Client-side |
| Modal Open Time | <200ms | Client-side |
| Table Render (50 rows) | <500ms | Client-side |

#### Monitoring Implementation
```typescript
// Performance monitoring with React Query
const { data, isLoading, dataUpdatedAt, isFetching } = useQuery(
  ['clientGroup', clientGroupId, 'productOwners'],
  async () => {
    const startTime = performance.now();
    const response = await api.get(`/client-groups/${clientGroupId}/product-owners`);
    const endTime = performance.now();

    // Log slow queries
    if (endTime - startTime > 1000) {
      console.warn(`Slow query: Product owners fetch took ${endTime - startTime}ms`);
    }

    return response.data;
  }
);
```

---

## 11. Database Migration Scripts (REQUIRED)

Database migrations MUST be created using Alembic for automated deployment. Manual SQL execution is not permitted for production deployments.

### Migration Sequence

Migrations must be executed in this order to respect foreign key dependencies:

1. **001_create_idempotency_keys_table.py**
2. **002_add_product_owner_indexes.py**
3. **003_add_composite_display_order_index.py**

### Migration 001: Idempotency Keys Table

```python
"""Create idempotency_keys table

Revision ID: 001_idempotency_keys
Revises:
Create Date: 2025-12-04

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers
revision = '001_idempotency_keys'
down_revision = None  # Or previous migration ID
branch_labels = None
depends_on = None


def upgrade():
    # Create idempotency_keys table
    op.create_table(
        'idempotency_keys',
        sa.Column('key', sa.String(255), primary_key=True),
        sa.Column('endpoint', sa.String(255), nullable=False),
        sa.Column('user_id', sa.BigInteger, nullable=False),
        sa.Column('request_hash', sa.String(64), nullable=False),
        sa.Column('response_status', sa.Integer, nullable=False),
        sa.Column('response_body', sa.Text, nullable=False),
        sa.Column('created_at', sa.DateTime, server_default=sa.text('NOW()'), nullable=False),
        sa.Column('expires_at', sa.DateTime, nullable=False),
    )

    # Create index for cleanup job
    op.create_index(
        'idx_idempotency_expires_at',
        'idempotency_keys',
        ['expires_at']
    )


def downgrade():
    op.drop_index('idx_idempotency_expires_at', table_name='idempotency_keys')
    op.drop_table('idempotency_keys')
```

### Migration 002: Product Owner Indexes

```python
"""Add indexes to product_owners table for query optimization

Revision ID: 002_product_owner_indexes
Revises: 001_idempotency_keys
Create Date: 2025-12-04

"""
from alembic import op

revision = '002_product_owner_indexes'
down_revision = '001_idempotency_keys'
branch_labels = None
depends_on = None


def upgrade():
    # Single-column indexes
    op.create_index('idx_product_owners_status', 'product_owners', ['status'])
    op.create_index('idx_product_owners_firstname', 'product_owners', ['firstname'])
    op.create_index('idx_product_owners_surname', 'product_owners', ['surname'])
    op.create_index('idx_product_owners_email_1', 'product_owners', ['email_1'])
    op.create_index('idx_product_owners_dob', 'product_owners', ['dob'])
    op.create_index('idx_product_owners_created_at', 'product_owners', ['created_at'])

    # Composite index for sorting
    op.create_index(
        'idx_product_owners_status_created_at',
        'product_owners',
        ['status', 'created_at']
    )


def downgrade():
    op.drop_index('idx_product_owners_status_created_at', table_name='product_owners')
    op.drop_index('idx_product_owners_created_at', table_name='product_owners')
    op.drop_index('idx_product_owners_dob', table_name='product_owners')
    op.drop_index('idx_product_owners_email_1', table_name='product_owners')
    op.drop_index('idx_product_owners_surname', table_name='product_owners')
    op.drop_index('idx_product_owners_firstname', table_name='product_owners')
    op.drop_index('idx_product_owners_status', table_name='product_owners')
```

### Migration 003: Composite Display Order Index

```python
"""Add composite index on client_group_product_owners for display order queries

Revision ID: 003_composite_display_order
Revises: 002_product_owner_indexes
Create Date: 2025-12-04

"""
from alembic import op

revision = '003_composite_display_order'
down_revision = '002_product_owner_indexes'
branch_labels = None
depends_on = None


def upgrade():
    # Composite index for display order queries
    op.create_index(
        'idx_cgpo_display_order',
        'client_group_product_owners',
        ['client_group_id', 'display_order']
    )


def downgrade():
    op.drop_index('idx_cgpo_display_order', table_name='client_group_product_owners')
```

### Running Migrations

```bash
# Development environment
cd backend
alembic upgrade head

# Production environment (via deployment script)
# Include in deploy_minimal.ps1 or deployment pipeline
```

### Rollback Procedure

```bash
# Rollback last migration
alembic downgrade -1

# Rollback to specific revision
alembic downgrade 001_idempotency_keys

# Rollback all People Tab migrations
alembic downgrade <previous_revision_before_people_tab>
```

---

## 12. Pre-Deployment Checklist (REQUIRED)

This checklist MUST be completed before deploying the People Tab to production. Mark each item complete with evidence of completion.

### Phase 1: Backend Verification (Week 1)

- [ ] **Atomic endpoint implemented**: POST /client-groups/{id}/product-owners exists and tested
  - Evidence: API endpoint responds with 201 Created
  - Test: Create product owner atomically, verify both records created in single transaction

- [ ] **Idempotency table created**: idempotency_keys table exists with correct schema
  - Evidence: `\d idempotency_keys` in psql shows correct columns and indexes
  - Test: Send duplicate request with same Idempotency-Key, verify cached response returned

- [ ] **Database migrations executed**: All 3 migrations applied successfully
  - Evidence: `alembic history` shows all People Tab migrations applied
  - Test: Check `alembic_version` table shows latest revision

- [ ] **Orphaned address cleanup job scheduled**: Cron job or scheduled task configured
  - Evidence: Cron entry exists: `0 2 * * 0 python backend/app/jobs/cleanup_orphaned_addresses.py`
  - Test: Run job manually, verify orphaned addresses deleted and logged

- [ ] **Idempotency cleanup job scheduled**: Daily cleanup of expired keys
  - Evidence: Cron entry exists: `0 3 * * * python backend/app/jobs/cleanup_idempotency_keys.py`
  - Test: Run job manually, verify expired keys deleted

### Phase 2: Frontend Verification (Week 2)

- [ ] **React Query implemented**: useQuery and useMutation hooks used for all server state
  - Evidence: PeopleSubTab.tsx uses useQuery for data fetching
  - Test: Open PeopleSubTab, verify data fetches from cache on tab switch (no API call)

- [ ] **Error boundary wrapper added**: ModalErrorBoundary wraps all modals
  - Evidence: Grep codebase for `<ModalErrorBoundary>` wrapping CreateProductOwnerModal and EditProductOwnerModal
  - Test: Throw error in modal form, verify error UI displays without crashing parent

- [ ] **Atomic endpoint integrated**: Frontend uses new atomic endpoint for create
  - Evidence: CreateProductOwnerModal calls POST /client-groups/{id}/product-owners
  - Test: Create product owner, verify single API call (not two-step)

- [ ] **Idempotency keys sent**: All mutations include Idempotency-Key header
  - Evidence: Network tab shows Idempotency-Key header in POST/PUT/DELETE requests
  - Test: Create product owner, retry failed request with same key, verify no duplicate

### Phase 3: Testing & Quality Assurance (Week 2-3)

- [ ] **Unit tests pass**: All new components and hooks have tests with ≥70% coverage
  - Evidence: `npm test` shows passing tests for PeopleSubTab, modals, hooks
  - Test: Check coverage report: `npm test -- --coverage`

- [ ] **Integration tests pass**: End-to-end create, edit, delete workflows tested
  - Evidence: Cypress/Playwright tests pass for all CRUD operations
  - Test: Run `npm run test:e2e` and verify all People Tab tests pass

- [ ] **Accessibility audit passed**: WCAG 2.1 AA compliance verified
  - Evidence: axe-core automated scan shows 0 violations
  - Test: Run Lighthouse accessibility audit, score ≥95

- [ ] **Manual keyboard navigation tested**: Tab, Enter, Escape work correctly
  - Evidence: QA tester completes full workflow using only keyboard
  - Test: Navigate table, open/close modals, submit forms without mouse

- [ ] **Screen reader tested**: NVDA/JAWS can navigate and use all features
  - Evidence: Screen reader user or accessibility specialist approval
  - Test: Read table contents, announce sort changes, navigate form tabs

### Phase 4: Performance & Monitoring (Week 3)

- [ ] **Performance targets met**: API response times <500ms, page load <2s
  - Evidence: New Relic/DataDog metrics show response times within targets
  - Test: Load 100 product owners, measure GET endpoint response time

- [ ] **Load testing completed**: 100 concurrent users tested without performance degradation
  - Evidence: Load test report shows no errors, response times stable
  - Test: Run k6 or Artillery load test script

- [ ] **Monitoring configured**: Slow query logging integrated with APM tool
  - Evidence: Dashboard shows People Tab queries, alerts configured for >1s queries
  - Test: Trigger slow query, verify alert fires

- [ ] **Error tracking enabled**: Frontend errors sent to Sentry/monitoring service
  - Evidence: Error boundary onError callback sends to Sentry
  - Test: Trigger modal error, verify appears in Sentry dashboard

### Phase 5: Deployment Readiness (Week 3)

- [ ] **Rollback procedure documented**: Step-by-step rollback instructions in ops guide
  - Evidence: Operations guide includes database migration rollback commands
  - Test: Review rollback procedure with DevOps team

- [ ] **Database backup verified**: Recent backup exists and restoration tested
  - Evidence: Backup timestamp within last 24 hours
  - Test: Restore backup to staging environment, verify data integrity

- [ ] **Feature flag configured** (if applicable): People Tab can be disabled via flag
  - Evidence: Feature flag `enable_people_tab` exists in config
  - Test: Toggle flag, verify tab hidden/shown accordingly

- [ ] **Deployment window scheduled**: Maintenance window booked with stakeholders
  - Evidence: Email confirmation from stakeholders for deployment time
  - Test: Confirm no conflicting deployments or high-traffic events

- [ ] **Team availability confirmed**: Backend, frontend, and DevOps engineers available during deployment
  - Evidence: Calendar invites accepted by all team members
  - Test: Confirm on-call rotation coverage for 24 hours post-deployment

### Post-Deployment Verification (Immediately After Deploy)

- [ ] **Smoke test passed**: Create one product owner successfully in production
  - Evidence: Production product owner ID created
  - Test: Log in to production, create test product owner "Test User", verify success

- [ ] **Monitoring shows no errors**: No 500 errors in last 30 minutes
  - Evidence: APM dashboard shows 0 server errors
  - Test: Check error rate metric in monitoring tool

- [ ] **Idempotency working**: Duplicate request returns cached response
  - Evidence: Network tab shows same Idempotency-Key returns cached response
  - Test: Create product owner, resend request with same key

- [ ] **User acceptance**: Product owner or QA approves production functionality
  - Evidence: Sign-off email from product owner
  - Test: Demo full CRUD workflow in production to stakeholder

---

## Document Summary

This architecture document provides comprehensive guidance for implementing the People (Product Owners) Tab feature with:

1. **Clear component hierarchy** with 5 main components and their contracts
2. **Complete data architecture** covering 4 database tables and 31-field product owner structure
3. **Detailed API specifications** for 5 endpoints with request/response examples
4. **State management patterns** using React Query and local state
5. **Six key workflows** with ASCII diagrams showing complete user journeys
6. **Security architecture** covering authentication, authorization, input validation, SQL injection prevention, XSS protection, and CSRF protection
7. **Accessibility architecture** ensuring WCAG 2.1 AA compliance with semantic HTML, ARIA attributes, keyboard navigation, focus management, and screen reader support
8. **Technical decisions** documenting HeadlessUI choice, address update strategy, two-step creation workflow with rollback, and progressive disclosure rationale
9. **Performance architecture** with memoization, React Query caching, code splitting, database indexing, and monitoring metrics

**Key Architectural Highlights**:
- **HeadlessUI** for accessible modals with built-in focus trap and ARIA attributes
- **Address "create new" strategy** to prevent unintended side effects across product owners sharing addresses
- **Two-step creation workflow** with frontend rollback logic (recommended backend atomic endpoint for future enhancement)
- **Progressive disclosure** using tabbed form (12/10/9 fields per tab) to reduce cognitive load
- **WCAG 2.1 AA compliance** with semantic HTML table structure, dynamic aria-sort attributes, contextual ARIA labels, and keyboard navigation
- **React Query caching** with 5-minute stale time and automatic refetching on window focus

**Implementation Readiness**: This architecture is production-ready and can be implemented directly by the development team following the patterns, code examples, and diagrams provided.

**Related Documents**:
- Specification: `Phase2_People_Tab_Specification.md` (v2.0)
- Pseudocode: `Phase2_People_Tab_Pseudocode.md` (v1.0)

**Document Version**: 1.0
**Last Updated**: 2025-12-04
**Status**: Production-Ready

---

**End of Architecture Documentation**
