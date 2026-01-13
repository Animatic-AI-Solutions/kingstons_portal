# Legal Documents Feature - Comprehensive TDD Implementation Plan

## Overview

This document outlines the comprehensive TDD implementation plan for the Legal Documents feature in Kingston's Portal. This is a full-stack feature requiring **backend implementation first**, followed by frontend implementation.

## Implementation Order

```
CRITICAL: Backend must be implemented FIRST so frontend has required infrastructure.

Phase 1: Backend (Plans 02-03)
  |
  +-- Database schema & migrations
  +-- FastAPI routes, Pydantic models, services
  +-- Backend API tests
  |
Phase 2: Frontend (Plans 04-08)
  |
  +-- TypeScript interfaces & API service
  +-- React Query hooks
  +-- LegalDocumentsTable component
  +-- Edit & Create modals
  +-- Integration testing
```

## Feature Summary

The Legal Documents feature provides a comprehensive system for managing legal documents (Wills, Powers of Attorney, Advance Directives) associated with client groups. Users can:

- View all legal documents in a sortable table with status indicators
- Create new legal documents with type selection via ComboDropdown
- Edit existing documents via a modal dialog
- Lapse, reactivate, or delete documents
- See lapsed documents greyed out and sorted to the bottom
- Associate documents with multiple product owners

## Document Types

| Type | Description | Code |
|------|-------------|------|
| Will | Last Will and Testament | `will` |
| LPOA P&F | Lasting Power of Attorney - Property & Financial | `lpoa_pf` |
| LPOA H&W | Lasting Power of Attorney - Health & Welfare | `lpoa_hw` |
| EPA | Enduring Power of Attorney | `epa` |
| General Power of Attorney | General POA | `gpa` |
| Advance Directive | Advance Healthcare Directive | `advance_directive` |
| Custom | User-defined document type | `custom:{name}` |

## Document Statuses

| Status | Description | UI Treatment |
|--------|-------------|--------------|
| Signed | Document has been signed | Normal display |
| Registered | Document has been registered | Normal display |
| Lapsed | Document has been lapsed | Greyed out, sorted to bottom |

**Note**: 'Lapsed' documents are greyed out and sorted to the bottom of the table.

## Architecture

### Backend Structure

```
backend/
  app/
    api/
      routes/
        legal_documents.py          # FastAPI routes
    models/
      legal_document.py             # Pydantic models
  tests/
    test_legal_documents_routes.py  # API tests
```

### Frontend Structure

```
frontend/src/
  components/
    phase2/
      legal-documents/
        index.ts                        # Barrel exports
        LegalDocumentsTable.tsx         # Main table component
        LegalDocumentModal.tsx          # Edit document modal
        CreateLegalDocumentModal.tsx    # Create document modal
        constants.ts                    # Document types, status values
        plans/                          # This documentation
          plan-01-overview.md
          plan-02-backend-database.md
          plan-03-backend-api.md
          plan-04-frontend-types-api.md
          plan-05-frontend-hooks.md
          plan-06-frontend-table.md
          plan-07-frontend-modals.md
          plan-08-integration.md
  hooks/
    useLegalDocuments.ts                # React Query hooks
  services/
    legalDocumentsApi.ts                # API service functions
  types/
    legalDocument.ts                    # TypeScript interfaces
```

### Database Schema

```
legal_documents                         # Main table
  |
  +-- id (PK)
  +-- type (VARCHAR)
  +-- document_date (DATE)
  +-- status (VARCHAR)
  +-- notes (TEXT, max 2000 chars)
  +-- created_at (TIMESTAMP)
  +-- updated_at (TIMESTAMP)

product_owner_legal_documents           # Junction table (M:N)
  |
  +-- product_owner_id (FK)
  +-- legal_document_id (FK)
```

### Data Flow

```
ClientGroupPhase2.tsx
  |
  +-- useLegalDocuments(clientGroupId)  # React Query hook
  |     |
  |     +-- fetchLegalDocuments()       # API call -> GET /api/legal_documents
  |     +-- mutations
  |           +-- create -> POST /api/legal_documents
  |           +-- update -> PUT /api/legal_documents/:id
  |           +-- updateStatus -> PATCH /api/legal_documents/:id/status
  |           +-- delete -> DELETE /api/legal_documents/:id
  |
  +-- LegalDocumentsTable
        |
        +-- Phase2Table (reused component)
        +-- Actions (Lapse/Reactivate/Delete icons)
        +-- LegalDocumentModal (on row click)
        +-- CreateLegalDocumentModal (on Add button)
```

## Pattern References

This feature follows established patterns from:

### Backend Patterns
- **Routes**: `backend/app/api/routes/special_relationships.py`
- **Models**: `backend/app/models/special_relationship.py`, `vulnerability.py`
- **Tests**: `backend/tests/test_special_relationships_routes.py`

### Frontend Patterns
- **Table**: `frontend/src/components/phase2/tables/Phase2Table.tsx`
- **Modal**: `frontend/src/components/phase2/special-relationships/EditSpecialRelationshipModal.tsx`
- **Hook**: `frontend/src/hooks/useSpecialRelationships.ts`
- **API Service**: `frontend/src/services/specialRelationshipsApi.ts`

## TDD Methodology

Each component follows the Red-Green-Blue TDD cycle:

### Red Phase (Tester-Agent)
- Write failing tests first
- Tests define expected behavior
- Tests should be comprehensive but focused
- Include accessibility tests (keyboard navigation, focus management)
- Include validation tests (notes 2000 char max)
- Include optimistic update tests that verify cache state

### Green Phase (coder-agent)
- Write minimal code to pass tests
- No premature optimization
- Focus on making tests green

### Blue Phase (coder-agent)
- Refactor for quality and consistency
- Apply patterns from reference components
- Add documentation and accessibility attributes
- Ensure WCAG 2.1 AA compliance

## Plan Files

| File | Phase | Content |
|------|-------|---------|
| `plan-01-overview.md` | - | This file - summary and architecture |
| `plan-02-backend-database.md` | Backend | Database schema, migrations, setup |
| `plan-03-backend-api.md` | Backend | FastAPI routes, Pydantic models |
| `plan-04-frontend-types-api.md` | Frontend | TypeScript interfaces, API service |
| `plan-05-frontend-hooks.md` | Frontend | React Query hooks |
| `plan-06-frontend-table.md` | Frontend | LegalDocumentsTable component |
| `plan-07-frontend-modals.md` | Frontend | Edit and Create modals |
| `plan-08-integration.md` | Frontend | Full integration testing |

## Critical Requirements

Based on the analysis, these requirements must be addressed:

1. **Backend First**: Backend must be implemented before frontend
2. **Lapsed Status**: Use 'Lapsed' status (not 'Inactive' or 'Deceased')
3. **Flexible Type**: TypeScript interface should allow `type: LegalDocumentType | string` for custom types
4. **Accessibility**: Include proper keyboard navigation, focus management
5. **Optimistic Updates**: Tests must verify cache state changes
6. **Notes Validation**: 2000 character maximum for notes field
7. **Product Owner Association**: Many-to-many relationship via junction table

## Success Criteria

- [ ] Backend API tests pass with comprehensive coverage
- [ ] Frontend tests pass with 70%+ coverage
- [ ] WCAG 2.1 AA accessibility compliance
- [ ] Consistent with Phase 2 patterns
- [ ] Loading, error, and empty states implemented
- [ ] Optimistic updates for status changes with rollback
- [ ] Form validation with clear error messages
- [ ] Notes field validates 2000 char max
- [ ] Lapsed documents sorted to bottom and greyed out
- [ ] Custom document types supported

## Dependencies

### Backend
- FastAPI
- Pydantic v2
- asyncpg
- pytest, pytest-asyncio

### Frontend
- React Query v4+
- date-fns for date formatting
- Tailwind CSS for styling
- react-hot-toast for notifications
- Jest + React Testing Library for tests

## Next Steps

1. Implement Backend (Plan 02 -> Plan 03)
2. Implement Frontend Types & API (Plan 04)
3. Implement Hooks (Plan 05)
4. Implement Table (Plan 06)
5. Implement Modals (Plan 07)
6. Integration Testing (Plan 08)
