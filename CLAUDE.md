# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Kingston's Portal is a comprehensive wealth management system built with FastAPI (Python) backend and React/TypeScript frontend. It manages client groups, financial products, portfolios, funds, and performance analytics for financial advisors.

## Documentation Structure

The project has comprehensive documentation in `docs/` organized in 10 logical sections:
- `01_introduction/` - Project goals and capabilities overview
- `02_getting_started/` - Setup, installation, and troubleshooting
- `03_architecture/` - System design and technical architecture  
- `04_development_workflow/` - Git workflow, code review, testing, deployment
- `05_development_standards/` - Coding principles and conventions
- `06_performance/` - Performance monitoring and optimization
- `07_security/` - Security considerations and authentication
- `08_operations/` - Deployment, rollback, and maintenance procedures
- `09_database/` - Database schema and documentation
- `10_reference/` - Frontend guide and documentation usage

**Key Documentation Files**:
- `docs/README.md` - Main navigation hub for all documentation
- `docs/04_development_workflow/01_git_workflow.md` - Git practices and branching strategy
- `docs/03_architecture/01_system_architecture_overview.md` - Complete system overview
- `docs/03_architecture/10_client_group_phase2_prototype.md` - Phase 2 client management prototype architecture

## Common Development Commands

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
- `app/api/routes/` - 22 API route modules (clients, products, funds, analytics, etc.)
- `app/models/` - Pydantic models for validation
- `app/db/database.py` - PostgreSQL connection management
- `app/services/` - Business logic (IRR calculations, etc.)
- `app/utils/` - Utilities (security, email, caching)

### Frontend (`frontend/src/`)
- `App.tsx` - Main application with routing and React Query
- `pages/` - 38+ page components including:
  - `ClientGroupPhase2.tsx` - Advanced client management prototype with 30+ person fields, comprehensive data structures
- `components/` - 69+ components organized by phase and purpose:
  - `ui/` - Reusable UI component library (buttons, inputs, modals, tables, badges, navigation, feedback)
  - `phase2/` - Modern, consistent components (people, special-relationships, client-groups) ✅ REFERENCE STANDARD
  - `phase1/` - Legacy components to be refactored (reports, funds, activities) ⚠️ BUG FIXES ONLY
  - `auth/` - Authentication forms and flows
  - `layout/` - App layout components (Sidebar, TopBar, Footer)
  - `_archive/` - Deprecated components (DO NOT USE)
- `hooks/` - Custom React hooks
- `services/` - API clients and report services
- `utils/` - Shared utilities and formatters

See `frontend/src/components/README.md` for detailed component organization and placement guide.

## Component Placement Guide

### Where to Put New Components

**UI Component Library** (`ui/`):
- ✅ Truly reusable across 3+ features
- ✅ No business logic or feature coupling
- ✅ Examples: Buttons, inputs, modals, tables, badges
- Import: `import { ComponentName } from '@/components/ui'`

**Phase 2 - Modern Components** (`phase2/`):
- ✅ New features and major refactors
- ✅ Follow People tab reference patterns
- ✅ Well-tested, accessible, documented
- ✅ Examples: People tab, Special Relationships
- Import: `import { ComponentName } from '@/components/phase2/[feature]'`

**Phase 1 - Legacy** (`phase1/`):
- ⚠️ **Bug fixes ONLY** - do not add new features
- ⚠️ Scheduled for migration to Phase 2
- ⚠️ Examples: IRR reports, funds management
- Import: `import { ComponentName } from '@/components/phase1/[category]'`

**Layout & Auth**:
- Layout components: `layout/` (Sidebar, TopBar, Footer)
- Auth components: `auth/` (LoginForm, ProtectedRoute)

**Archive**:
- ❌ DO NOT USE - deprecated components only

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
- **Import style**:
  - UI components: `import { ActionButton, ModalShell, StatusBadge } from '@/components/ui'`
  - Phase 2 components: `import { ProductOwnerTable } from '@/components/phase2/people'`
  - Phase 1 components: `import { ReportContainer } from '@/components/phase1/reports'`
  - Layout/Auth: `import Sidebar from '@/components/layout/Sidebar'`
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
- **Database Views**: Historical IRR views include lapsed products for compliance - prefer fixing filtering at view level over API workarounds
- **Client Group Phase 2 Prototype**: Advanced client management with horizontal tab navigation, 30+ person fields, comprehensive health/vulnerability tracking, document management (Wills/LPOAs), risk assessments (1-7 scale), meeting suite, and detailed modal editing. See `docs/03_architecture/10_client_group_phase2_prototype.md` for complete documentation

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

## Git Workflow and Version Control

### Branching Strategy
- **`main` branch**: Production-ready code, protected, requires PR reviews
- **Feature branches**: Use for all development work with descriptive naming:
  - `feature/feature-name` - New features
  - `fix/bug-name` - Bug fixes  
  - `docs/update-name` - Documentation updates
  - `refactor/component-name` - Code refactoring

### Commit Guidelines
- **Use clear, descriptive commit messages** that explain what was changed
- **Commit frequently** with logical units of work
- **Run tests before committing**: `npm test` and `npm run build`
- **Follow project coding standards**

### Development Workflow
```bash
# Start development
git checkout main && git pull origin main
git checkout -b feature/new-feature

# Regular development
git add . && git commit -m "Clear description of changes"
git push origin feature/new-feature

# Create PR when ready
# After merge, cleanup branch
```

### Post-Fix Cleanup
After fixing issues or bugs:
- **Remove debug logs** created specifically for troubleshooting
- **Remove temporary test scripts** or documentation made only for debugging
- **Only clean up after confirming the fix works** through evidence
- **Update necessary documentation** affected by the fix

### Code Comments Best Practices
- **Explain non-obvious implementation choices**: Why one function over another
- **Document business logic reasoning** behind calculations
- **Mark complex nested code blocks** with comments explaining each section's purpose
- **Include performance or security considerations** when relevant

Example of good commenting:
```typescript
// Calculate total portfolio value using reduce for performance over forEach
// (reduce is faster for large datasets and creates immutable result)
const totalValue = portfolios.reduce((sum, portfolio) => {
  // Sum active fund valuations only - excludes lapsed/terminated funds  
  // per business requirement to show only current holdings
  const activeFunds = portfolio.funds.filter(fund => fund.status === 'active');
  return sum + activeFunds.reduce((fundSum, fund) => fundSum + fund.valuation, 0);
}, 0);
```

## Documentation & AI Assistant Guidelines

### Documentation Governance
- **When to Create Documentation**: Only for complex architectural changes or new feature areas not covered in existing docs
- **When NOT to Create Documentation**: Avoid redundant files, simple bug fixes, or features already well-documented  
- **AI-Assisted Development**: Use "finish commit" workflow for comprehensive commit messages and documentation updates
- **Maintenance Triggers**: Update docs when changing core architecture, adding new major features, or modifying API contracts

### For AI Code Assistants
- **Follow SPARC methodology** for all feature development
- **Use existing component library** before creating new components
- **Maintain 70% test coverage** threshold with comprehensive testing
- **Implement accessibility standards** (WCAG 2.1 AA) for all UI components
- **Use London School TDD** approach with outside-in development and mocking

# important-instruction-reminders
Do what has been asked; nothing more, nothing less.
NEVER create files unless they're absolutely necessary for achieving your goal.
ALWAYS prefer editing an existing file to creating a new one.
NEVER proactively create documentation files (*.md) or README files. Only create documentation files if explicitly requested by the User.