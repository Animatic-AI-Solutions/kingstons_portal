# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Kingston's Portal is a comprehensive wealth management system built with FastAPI (Python) backend and React/TypeScript frontend. It manages client groups, financial products, portfolios, funds, and performance analytics for financial advisors.

## Common Development Commands

### Backend Development
```bash
# From backend/ directory
python main.py                    # Start FastAPI server on http://localhost:8001
pip install -r requirements.txt  # Install dependencies
pytest                           # Run all tests with asyncio support
pytest tests/test_specific.py    # Run specific test file
python check_schema.py           # Test database connection and schema
```

### Frontend Development
```bash
# From frontend/ directory  
npm start                        # Start Vite dev server on http://localhost:3000
npm run build                    # Build for production
npm test                         # Run Jest tests
npm run test:watch               # Run tests in watch mode
npm run test:coverage            # Run tests with coverage report
```

### Database Operations
```bash
# Test PostgreSQL connection
python backend/check_schema.py

# Connect to database directly  
psql $DATABASE_URL

# Verify migration data
python backend/database_analysis_report.py
```

## Environment Configuration

### Backend `.env` Requirements
```env
# Primary database connection (REQUIRED)
DATABASE_URL=postgresql://kingstons_app:password@host:port/kingstons_portal

# Legacy Supabase support (optional for migration)
SUPABASE_URL=https://your-project-id.supabase.co
SUPABASE_KEY=your-supabase-anon-key

# Security configuration (REQUIRED)
JWT_SECRET=your-jwt-secret
ACCESS_TOKEN_EXPIRE_MINUTES=1440

# Development settings
DEBUG=true
API_HOST=127.0.0.1
API_PORT=8001
```

**Note**: The system has migrated from Supabase to PostgreSQL. `DATABASE_URL` is the primary connection string.

## Architecture Overview

### Backend Structure (`backend/`)
- `main.py` - FastAPI application entry point with CORS, httpOnly cookie auth, and route registration
- `app/api/routes/` - API endpoints organized by domain (25+ modules: clients, products, funds, analytics, etc.)
- `app/models/` - Pydantic models for request/response validation
- `app/db/database.py` - PostgreSQL connection pool management using `DATABASE_URL`
- `app/services/` - Business logic services (IRR calculations, cascade operations)
- `app/utils/` - Utility functions (security, email, caching, transaction coordination)

### Frontend Structure (`frontend/src/`)
- `App.tsx` - Main application with routing and React Query providers
- `pages/` - 35+ page components organized by feature area
- `components/` - 35+ reusable UI components with comprehensive component library:
  - `ui/` - Base UI components (buttons, inputs, tables, search)
  - `auth/` - Authentication forms and flows
  - `layout/` - App layout components
  - `report/` - Advanced reporting system with modular architecture
- `hooks/` - Custom React hooks for data fetching and state management
- `services/` - API clients and specialized services (report generation, IRR calculations)
- `context/` - React context providers (Auth with httpOnly cookie support)
- `utils/` - Shared modules following DRY principles (formatters, constants)

### Database Design (PostgreSQL)
Complex 5-level hierarchy financial data model with 20+ core tables:
- **Client Management**: `client_groups`, `product_owners`, `client_group_product_owners`
- **Product Management**: `client_products`, `available_providers`, `provider_switch_log`
- **Portfolio System**: `portfolios`, `available_portfolios`, `template_portfolio_generations`
- **Fund Management**: `portfolio_funds`, `available_funds`, `portfolio_fund_valuations`
- **Performance Tracking**: `portfolio_irr_values`, `portfolio_fund_irr_values`
- **Activity Logging**: `holding_activity_log` for complete audit trails
- **Ultra-Fast Analytics**: Pre-computed views (`company_irr_cache`, `analytics_dashboard_summary`) for sub-second performance

## Key Technical Patterns

### API Design
- RESTful endpoints with consistent naming (`/api/{resource}`)
- Bulk optimization endpoints for complex data (`/api/bulk_client_data`)
- **HttpOnly Cookie Authentication**: Primary authentication method for enhanced XSS protection
- Ultra-fast analytics system with pre-computed database views
- Comprehensive pagination, filtering, and sorting
- Triple-layer auth support (httpOnly cookies, Authorization headers, session cookies)

### Frontend Patterns
- **React Query** for server state management with 5-minute default caching
- **Shared Modules Architecture**: Eliminates code duplication through centralized types, formatters, and constants
- **Component Library**: 35+ reusable UI components following consistent design patterns
- **Smart Navigation**: Context-aware breadcrumb navigation for improved UX
- **Report System**: Modular architecture with specialized services (ReportStateManager, IRRCalculationService, PrintService)
- **Error Boundaries**: Production-ready error handling with graceful degradation

### Testing Strategy
- **Backend**: pytest with asyncio support, comprehensive fixtures
- **Frontend**: Jest with React Testing Library, 92 comprehensive tests for shared modules
- **Database**: Migration scripts with verification and rollback capabilities
- **London School TDD**: Outside-in development with mocks and dependency injection

## Development Guidelines

### Code Quality Standards (SPARC)
- **File Size**: ≤500 lines per file, ≤50 lines per function
- **SOLID Principles**: Single responsibility, dependency injection, interface segregation
- **DRY Implementation**: Shared modules eliminate 200+ lines of duplicate code
- **Security**: No hard-coded credentials, comprehensive input validation, XSS protection
- **Accessibility**: WCAG 2.1 AA compliance with high contrast design

### Component Development
1. **Check Existing Components**: Always review `frontend/src/components/ui/` before creating new ones
2. **Follow Patterns**: Study similar components for consistent implementation approaches
3. **Use Component Library**: ActionButton, DataTable, StatBox, SearchableDropdown, etc.
4. **Leverage Services**: Use established service patterns for API communication
5. **State Management**: React Query for server state, hooks for local state

### Financial Data Handling
- **IRR Calculations**: Use `numpy-financial` library for accurate mathematical computations
- **Performance Tracking**: Store in `portfolio_irr_values` and `portfolio_fund_irr_values` tables
- **Activity Logging**: All transactions logged in `holding_activity_log` for audit compliance
- **Smart Formatting**: Intelligent decimal handling removes unnecessary trailing zeros

## Advanced Features

### Ultra-Fast Analytics System
- **Problem Solved**: Reduced analytics dashboard load from 67+ seconds to sub-second response
- **Implementation**: Pre-computed database views with 24-hour intelligent caching
- **Endpoints**: `/analytics/dashboard-fast` (instant), `/analytics/company/irr/refresh-background` (async updates)
- **Cache Management**: Automatic invalidation with manual refresh capability

### Report Generation System
- **Modular Architecture**: ReportContainer, SummaryTab, IRRHistoryTab with specialized services
- **Advanced Validation**: End valuation date matching with real-time user feedback  
- **Print Optimization**: Landscape orientation with asset optimization
- **Error Handling**: Production-ready boundaries with graceful degradation

### Security Implementation
- **HttpOnly Cookies**: Primary authentication method prevents XSS attacks
- **Triple-Layer Auth**: Cookie JWT, Authorization headers, session validation
- **Input Validation**: Comprehensive sanitization for financial data integrity
- **Audit Trails**: Complete transaction logging for regulatory compliance

## Common Workflows

### Adding New API Endpoints
1. Create route file in `app/api/routes/`
2. Define Pydantic models for request/response validation
3. Implement database queries using connection pool from `get_db()`
4. Add authentication with `get_current_user` dependency
5. Register route in `main.py`
6. Write pytest tests with asyncio fixtures

### Adding New Frontend Features
1. Check existing components and services for reusable patterns
2. Create custom hooks following established patterns in `hooks/`
3. Use React Query for server state management
4. Implement UI with existing component library
5. Add comprehensive tests with Jest and React Testing Library
6. Follow accessibility guidelines and responsive design

### Database Schema Changes
1. Update database schema in root `database.sql`
2. Create migration scripts in `migration_scripts/`
3. Update affected Pydantic models
4. Modify API endpoints and database queries
5. Update frontend types and components
6. Test migration with verification scripts

### Performance Optimization
1. **Database**: Use pre-computed views for complex aggregations
2. **API**: Implement bulk endpoints for efficient data loading
3. **Frontend**: Leverage React Query caching and lazy loading
4. **Analytics**: Use specialized fast endpoints for real-time dashboards

## Architecture Documentation

For comprehensive architectural details, refer to the extensive documentation in `docs/`:
- `docs/3_architecture/01_system_architecture_overview.md` - Complete system overview
- `docs/3_architecture/03_database_schema.md` - Detailed database documentation  
- `docs/3_architecture/04_api_design.md` - API design principles and patterns
- `docs/3_architecture/05_shared_modules_pattern.md` - Frontend architecture patterns
- `docs/4_development_standards/01_coding_principles.md` - SPARC methodology and standards

The documentation provides detailed implementation guides, visual diagrams, and best practices for working with this sophisticated wealth management system.