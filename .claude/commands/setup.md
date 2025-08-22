  To effectively work on Kingston's Portal, please complete this familiarization sequence:

  ## Step 1: Core Understanding
  Read `CLAUDE.md` to understand:
  - Development commands and environment setup
  - Key components, services, and utilities to use
  - SPARC methodology and code quality standards
  - Project-specific patterns and constraints
  
  Then review `docs/README.md` for complete documentation navigation.

  ## Step 2: Architecture Deep Dive
  Read these documentation files in order:
  1. `docs/03_architecture/01_system_architecture_overview.md` - Complete system overview
  2. `docs/03_architecture/03_database_schema.md` - Database structure and relationships
  3. `docs/05_development_standards/01_coding_principles.md` - SPARC methodology details
  4. `docs/03_architecture/05_frontend_architecture.md` - Frontend architecture patterns
  5. `docs/04_development_workflow/01_git_workflow.md` - Git practices and version control

  ## Step 3: Component Library
  Review the component library structure:
  - Read `frontend/src/components/ui/COMPONENT_GUIDE.md`
  - Browse `frontend/src/components/ui/index.ts` to see available components
  - Understand the 5 component groups: Inputs, Search, Selection, Actions, Data Display

  ## Step 4: Key Service Patterns
  Examine these service patterns:
  - `frontend/src/services/report/` - Report generation architecture
  - `frontend/src/hooks/` - Custom React hooks for data management
  - `backend/app/services/` - Backend business logic services

  ## Step 5: Testing Approach
  Review testing patterns:
  - `frontend/src/tests/services/report/` - Service testing examples
  - `frontend/src/tests/` - Utility and formatter tests
  - Understand TDD approach and 70% coverage requirements

  ## Confirmation
  When ready, confirm: "Familiarized with Kingston's Portal architecture, SPARC methodology, git workflow, component library, and testing patterns."