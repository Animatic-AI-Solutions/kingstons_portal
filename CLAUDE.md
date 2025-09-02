# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Kingston's Portal is a comprehensive wealth management system built with FastAPI (Python) backend and React/TypeScript frontend. Phase 2 enhanced the system with professional-grade client data management, including the Big 5 categories (basic_detail, income_expenditure, assets_liabilities, protection, vulnerability_health), advanced phone management, and information-dense interfaces optimized for financial advisor workflows.

**Key Enhancements**:
- **Professional Interface**: Information-dense displays prioritizing data visibility over aesthetics
- **Enhanced Client Data**: Big 5 categories with structured data organization and asset liquidity rankings
- **3-Section Layout**: Product owner cards with Personal + Contact + Full-width compliance sections
- **Global Actions**: Cross-client management workflow capabilities
- **Security Framework**: Field-level encryption and comprehensive audit logging
- **Multi-Layer Performance**: Sub-500ms rendering for dense tables with 100+ rows

## Documentation Structure

The project has comprehensive documentation in `docs/` organized in 10 logical sections following the complete 7-phase refactor:
- `01_introduction/` - Project goals and Phase 2 enhancement overview
- `02_getting_started/` - Setup, installation, and troubleshooting with enhanced configuration
- `03_architecture/` - Complete system design including Phase 2 database schema, API endpoints, and frontend architecture
- `04_development_workflow/` - Git workflow, code review, testing, deployment with Phase 2 implementation sequence
- `05_development_standards/` - Coding principles, conventions, and Phase 2 development standards
- `06_performance/` - Advanced performance monitoring, optimization, and information-dense interface performance
- `07_security/` - Multi-layer security framework with field-level encryption, audit logging, and compliance
- `08_operations/` - Comprehensive deployment, rollback, maintenance, and Phase 2 migration procedures
- `09_database/` - Enhanced database schema with Phase 2 implementation details
- `10_reference/` - Frontend guide with Phase 2 component library and user workflows

**Key Documentation Files**:
- `docs/README.md` - Main navigation hub for all documentation
- `docs/03_architecture/10_phase2_database_schema.md` - Enhanced database schema with Big 5 categories
- `docs/03_architecture/11_phase2_api_endpoints.md` - Phase 2 API endpoints and enhanced product owner cards
- `docs/03_architecture/12_phase2_frontend_architecture.md` - Information-dense frontend architecture
- `docs/07_security/04_field_level_encryption.md` - Field-level encryption implementation
- `docs/06_performance/01_performance_monitoring.md` - Advanced performance monitoring
- `docs/04_development_workflow/01_git_workflow.md` - Git practices and branching strategy

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

# Phase 2 Enhanced Security (REQUIRED)
ENCRYPTION_KEY=your-field-encryption-key
AUDIT_LOGGING_ENABLED=true

# Development settings
DEBUG=true
API_HOST=127.0.0.1
API_PORT=8001

# Performance settings for information-dense interfaces
DENSE_TABLE_PAGE_SIZE=100
VIRTUAL_SCROLL_THRESHOLD=200
```

## Code Structure

### Backend (`backend/`)
- `main.py` - FastAPI application entry point
- `app/api/routes/` - 28+ API route modules (clients, products, funds, analytics, Phase 2 enhancements)
- `app/models/` - Pydantic models for validation (enhanced with Big 5 categories)
- `app/db/database.py` - PostgreSQL connection management with encryption support
- `app/services/` - Business logic (IRR calculations, encryption, audit logging)
- `app/utils/` - Utilities (security, email, caching, field encryption, liquidity ranking)

### Frontend (`frontend/src/`)
- `App.tsx` - Main application with routing and React Query
- `pages/` - 45+ page components (including Phase 2 enhancements)
- `components/` - 95+ reusable UI components:
  - `ui/` - Enhanced base components (dense tables, information-dense inputs, professional buttons)
  - `phase2/` - Information-dense components (3-section cards, global actions, liquidity tables)
  - `auth/` - Authentication forms and flows
  - `layout/` - App layout components
  - `report/` - Advanced reporting system with modular architecture
- `hooks/` - Custom React hooks (enhanced with Phase 2 data management)
- `services/` - API clients, report services, encryption services
- `utils/` - Shared utilities, formatters, and Phase 2 data handlers

## Key Patterns

### Authentication & Security
- HttpOnly cookies for XSS-resistant authentication
- JWT tokens for API access with enhanced expiration handling
- PostgreSQL user sessions with audit logging
- Field-level encryption for sensitive client data
- Multi-layer security framework with comprehensive audit trails
- Real-time presence indicators for concurrent user management

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
**Phase 2 Enhanced Components**:
**Dense Tables**: DenseDataTable, VirtualizedTable, EditableTableRow, ExpandableTableRow
**3-Section Cards**: ProductOwnerCard3Section, ClientDetailsLayout
**Professional Inputs**: PhoneNumberInput, OwnershipPercentageInput, DenseFormInput, ExpandableTextArea
**Information Management**: InformationItemsTable, GlobalActionsTable, LiquidityOrderedTable
**Status & Feedback**: StatusIndicator, PresenceIndicator, AutoSaveIndicator, ProgressMeter

**Enhanced Legacy Components**:
**Buttons**: ActionButton, EditButton, AddButton, DeleteButton, DenseEditButton, InlineActionButton
**Data Display**: DataTable (enhanced), StatBox, StatCard, FundDistributionChart, NetWorthTable
**Inputs**: BaseInput, NumberInput, SearchInput, DateInput, CategoryDropdownWithEmoji
**Dropdowns**: SearchableDropdown, MultiSelectDropdown, ComboDropdown, PhoneTypeSelector
**Feedback**: EmptyState, ErrorDisplay, Skeleton components (all enhanced for information density)

### Key Services & Utilities
**Phase 2 Enhanced Services**:
**Security Services**: FieldEncryptionService, AuditLoggingService, DataClassificationService
**Data Management**: EnhancedClientDataService, GlobalActionsService, LiquidityRankingService
**Performance Services**: VirtualScrollService, DenseTableRenderer, OptimizedDataLoader

**Enhanced Legacy Services**:
**Report Services**: ReportStateManager, IRRCalculationService, PrintService, ReportFormatter
**Data Hooks**: useClientData, useOptimizedClientData, useSmartNavigation, useDashboardData, usePhase2ClientData
**Utilities**: formatMoney, formatters from `utils/`, productOwnerUtils, liquidityUtils, encryptionUtils
**Authentication**: httpOnly cookies via AuthContext with enhanced security

### Financial Domain Specifics
- **IRR Calculations**: Use IRRCalculationService, not direct numpy-financial
- **Portfolio Management**: 5-level hierarchy (client_groups → products → portfolios → funds → valuations)
- **Enhanced Client Data**: Big 5 categories (basic_detail, income_expenditure, assets_liabilities, protection, vulnerability_health)
- **Asset Management**: Liquidity-based rankings with user customization via `asset_liquidity_rankings` table
- **Audit Logging**: Enhanced logging to `holding_activity_log` and `product_owners_audit_log` for sensitive field changes
- **Bulk Operations**: Use `/api/bulk_client_data` patterns for performance with Phase 2 enhancements
- **Report Generation**: ReportContainer → SummaryTab/IRRHistoryTab → PrintService with global actions export
- **Phone Management**: Multi-type phone system (mobile, house_phone, work, other) with primary designation
- **Global Actions**: Cross-client workflow management via `global_actions` and `global_action_assignments`

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
- **Phase 2 Multi-Layer Architecture**: Information-dense interfaces with professional-grade data management
- **Shared Modules**: Centralized types, formatters, encryption utilities in `utils/` - always check before duplicating
- **Report System**: Modular with ReportContainer orchestrating specialized tabs, enhanced with global actions export
- **Smart Navigation**: useSmartNavigation for context-aware breadcrumbs with Phase 2 enhancements
- **Concurrent Users**: PresenceIndicator and useConcurrentUserDetection for real-time awareness with conflict resolution
- **Bulk Data**: OptimizedClientData patterns enhanced for information-dense displays with virtual scrolling
- **Information Density**: Table-first approach with 12+ rows per view, compact 32-40px row heights
- **Security Architecture**: Field-level encryption with transparent decryption for authorized users
- **Performance Optimization**: Sub-500ms rendering for dense tables, virtual scrolling for 200+ items

## Development Principles

### SPARC Methodology
Follow the 5-phase SPARC process defined in `.cursorrules`:
1. **Specification** - Define clear objectives and requirements
2. **Pseudocode** - Map logical implementation before coding  
3. **Architecture** - Design modular components with clear boundaries
4. **Refinement** - Implement with TDD, debugging, security checks
5. **Completion** - Integrate, document, test, and verify

### Code Quality Standards
- **File Limits**: ≤500 lines per file, ≤50 lines per function (information-dense components may approach limits)
- **Security**: No hard-coded credentials, validate all inputs, implement field-level encryption for sensitive data
- **SOLID Principles**: Single responsibility, dependency injection, enhanced for Phase 2 multi-layer architecture
- **DRY**: Use shared modules, eliminate duplication, leverage Phase 2 utilities and services
- **TDD**: Write tests first, comprehensive testing for information-dense interfaces and security features
- **Information Density**: Prioritize data visibility over aesthetics in UI components
- **Performance**: Sub-500ms rendering targets for dense tables, virtual scrolling implementation

### Environment & Testing
- **Environment Variables**: Agent cannot access directly - use scripts to read `.env` files, include Phase 2 encryption keys
- **Testing**: Use real implementations with TDD, comprehensive testing for information-dense interfaces and security features
- **Coverage**: Maintain 70% threshold with Jest (ts-jest warnings expected), enhanced coverage for Phase 2 components
- **Security Testing**: Field-level encryption validation, audit logging verification, performance testing for dense data
- **Performance Validation**: Sub-500ms rendering validation, virtual scrolling performance testing

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
- **Follow SPARC methodology** for all feature development, especially for information-dense interfaces
- **Use Phase 2 component library** before creating new components - prioritize DenseDataTable, 3-section cards
- **Maintain 70% test coverage** threshold with comprehensive testing for security and performance features
- **Implement accessibility standards** (WCAG 2.1 AA) enhanced for information-dense interfaces
- **Use London School TDD** approach with outside-in development, enhanced for Phase 2 complexity
- **Information Density Priority**: Always choose table layouts over cards for tabular data
- **Security First**: Implement field-level encryption for sensitive data, comprehensive audit logging
- **Performance Awareness**: Sub-500ms rendering targets, virtual scrolling for large datasets
- **Professional Interface Standards**: Follow wealth management industry conventions for data display

# important-instruction-reminders
Do what has been asked; nothing more, nothing less.
NEVER create files unless they're absolutely necessary for achieving your goal.
ALWAYS prefer editing an existing file to creating a new one.
NEVER proactively create documentation files (*.md) or README files. Only create documentation files if explicitly requested by the User.