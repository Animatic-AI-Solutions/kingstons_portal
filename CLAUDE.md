# CLAUDE.md

This file provides guidance to Claude Code when working with Kingston's Portal.

## Project Overview

Kingston's Portal is a wealth management system with FastAPI (Python) backend and React/TypeScript frontend. It manages client groups, financial products, portfolios, funds, and performance analytics.

## Development Commands

### Backend Development
```bash
# From backend/ directory
uvicorn main:app --reload --host 127.0.0.1 --port 8001  # Start FastAPI server
pip install -r requirements.txt  # Install dependencies
pytest                           # Run tests
```

### Frontend Development
```bash
# From frontend/ directory  
npm start                        # Start Vite dev server on port 3000
npm run build                    # Build for production
npm test                         # Run Jest tests (has deprecation warnings but works)
```

### Database Operations
```bash
psql $DATABASE_URL              # Connect to PostgreSQL database
```

### Production Deployment
```powershell
.\deploy_minimal.ps1            # Automated deployment (run as Administrator)
```

## Environment Configuration

### Backend `.env` Requirements
```env
# Database connection (REQUIRED)
DATABASE_URL=postgresql://kingstons_app:password@host:port/kingstons_portal

# Security configuration (REQUIRED)
JWT_SECRET=your-jwt-secret
ACCESS_TOKEN_EXPIRE_MINUTES=1440

# Development settings
DEBUG=true
API_HOST=127.0.0.1
API_PORT=8001
```

## Code Structure

### Backend (`backend/`)
- `main.py` - FastAPI application entry point
- `app/api/routes/` - 24 API route modules (clients, products, funds, analytics, etc.)
- `app/models/` - Pydantic models for validation
- `app/db/database.py` - PostgreSQL connection management
- `app/services/` - Business logic (IRR calculations, etc.)
- `app/utils/` - Utilities (security, email, caching)

### Frontend (`frontend/src/`)
- `App.tsx` - Main application with routing and React Query
- `pages/` - 38 page components
- `components/` - Reusable UI components:
  - `ui/` - Base components (buttons, inputs, tables)
  - `auth/` - Authentication components
  - `layout/` - Layout components
  - `report/` - Reporting system
- `hooks/` - Custom React hooks
- `services/` - API clients and report services
- `utils/` - Shared utilities and formatters

## Key Patterns

### Authentication
- HttpOnly cookies for security
- JWT tokens for API access
- PostgreSQL user sessions

### Frontend
- React Query for server state management
- Vite for build tooling with proxy to backend
- Jest for testing (has ts-jest deprecation warnings)
- Component library in `components/ui/`
- Tailwind CSS for styling

### Backend
- FastAPI with async/await
- Pydantic models for validation
- asyncpg for PostgreSQL connections
- pytest for testing

## Development Guidelines

### Key Components to Use
**Buttons**: ActionButton, EditButton, AddButton, DeleteButton, LapseButton
**Data Display**: DataTable, StatBox, StatCard, FundDistributionChart
**Inputs**: BaseInput, NumberInput, SearchInput, DateInput  
**Dropdowns**: SearchableDropdown, MultiSelectDropdown, ComboDropdown
**Feedback**: EmptyState, ErrorDisplay, Skeleton components

### Key Services & Utilities
**Report Services**: ReportStateManager, IRRCalculationService, PrintService, ReportFormatter
**Data Hooks**: useClientData, useOptimizedClientData, useSmartNavigation, useDashboardData
**Utilities**: formatMoney, formatters from `utils/`, productOwnerUtils
**Authentication**: httpOnly cookies via AuthContext

### Financial Domain Specifics
- **IRR Calculations**: Use IRRCalculationService, not direct numpy-financial
- **Portfolio Management**: 5-level hierarchy (client_groups → products → portfolios → funds → valuations)
- **Audit Logging**: All changes go to `holding_activity_log` table
- **Bulk Operations**: Use `/api/bulk_client_data` patterns for performance
- **Report Generation**: ReportContainer → SummaryTab/IRRHistoryTab → PrintService

### Code Patterns
- **Import style**: `import { ActionButton, DataTable } from '@/components/ui'`
- **React Query**: 5-minute default caching, use custom hooks like useClientData
- **Error handling**: Use ErrorDisplay component and ReportErrorBoundary
- **State management**: React Query for server state, ReportStateManager for complex report state

### Testing Patterns
- **Service tests**: Mock external dependencies, test in `src/tests/services/report/`
- **Hook tests**: Use `@testing-library/react-hooks` for custom hooks
- **Component tests**: Use `render` from `@testing-library/react`, test user interactions
- **Utils tests**: Pure function tests in `src/tests/` (reportConstants.test.ts, formatters.test.ts)
- **Coverage**: Jest runs with ts-jest warnings but 70% threshold enforced

### Architecture Specifics
- **Shared Modules**: Centralized types, formatters in `utils/` - always check before duplicating
- **Report System**: Modular with ReportContainer orchestrating specialized tabs
- **Smart Navigation**: useSmartNavigation for context-aware breadcrumbs
- **Concurrent Users**: PresenceIndicator and useConcurrentUserDetection for real-time awareness
- **Bulk Data**: OptimizedClientData patterns for performance with large datasets

## Development Principles

### SPARC Methodology
Follow the 5-phase SPARC process defined in `.cursorrules`:
1. **Specification** - Define clear objectives and requirements
2. **Pseudocode** - Map logical implementation before coding  
3. **Architecture** - Design modular components with clear boundaries
4. **Refinement** - Implement with TDD, debugging, security checks
5. **Completion** - Integrate, document, test, and verify

### Code Quality Standards
- **File Limits**: ≤500 lines per file, ≤50 lines per function
- **Security**: No hard-coded credentials, validate all inputs
- **SOLID Principles**: Single responsibility, dependency injection
- **DRY**: Use shared modules, eliminate duplication
- **TDD**: Write tests first, no mock implementations

### Environment & Testing
- **Environment Variables**: Agent cannot access directly - use scripts to read `.env` files
- **Testing**: Use real implementations with TDD, not mocks unless testing isolation required
- **Coverage**: Maintain 70% threshold with Jest (ts-jest warnings expected)