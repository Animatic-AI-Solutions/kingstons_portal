---
title: "Documentation Maintenance Guide"
tags: ["documentation", "maintenance", "governance"]
---

# Documentation Maintenance Guide

> **Recent Updates (July 2025)**: 
> - **Client Page Performance Fixes**: Fixed infinite loop in ClientDetails.tsx by removing IIFE wrapper from PreviousFundsIRRDisplay component, eliminating browser freezing and improving page stability.
> - **Product Fund Visibility Fix**: Updated ProductOverview.tsx filtering logic to prioritize explicit database status over date-based inference, ensuring reactivated funds display correctly regardless of timing (fixed missing portfolio fund 715).
> - **IRR Calculation Accuracy**: Enhanced client total IRR calculation using proper standardized endpoints with cash flow-based mathematics instead of incorrect weighted averages. Fixed IRR display synchronization between backend calculations and frontend presentation.
> - **Product Owner Integration**: Updated client_groups.py backend endpoint to include product owners in API response, enabling complete product owner relationship visibility across client interfaces.
> 
> **Previous Updates (January 2025)**: 
> - **Documentation Validation**: Updated test coverage counts to reflect accurate test distributions: 26 formatter tests, 13 constants tests, and 53 service tests. Smart formatting functionality validated - tests show intelligent decimal formatting working correctly (removing unnecessary trailing zeros).
> - **UX Pattern Updates**: Updated design philosophy document to include new UX patterns: Intelligent Workflow Assistance (auto-selection of previous generation funds) and Expanded Interaction Areas (clickable rows for improved usability).
> - **IRR Calculation Fix**: Fixed client details page to use proper standardized multiple portfolio fund IRR calculation instead of mathematically incorrect weighted averages. Client IRR now uses `/analytics/client/{client_id}/irr` endpoint for accurate cash flow-based calculations.
> - **Port Standardization**: Corrected backend default port from 8000 to 8001 to maintain consistency with frontend proxy configuration and production environment.
> 
> **Previous Updates (December 2024)**: Documentation has been updated to reflect the new production architecture with Kingston03 server hosting, environment-based API configuration, and direct FastAPI service communication. See deployment process documentation for details.

## Overview

This guide provides instructions for maintaining and updating the documentation system for Kingston's Portal. It ensures that documentation remains current, accurate, and useful as the codebase evolves.

**Core Principle:** When you change the code, change the docs.

## 1. Update Triggers and Corresponding Actions

When a file or concept is modified, the corresponding documentation file(s) should be reviewed and updated.

---

### **Trigger: Database Schema (`database.sql`)**
*If this file changes, the following documentation must be updated:*

1.  **`docs/3_architecture/03_database_schema.md`**
    - **Action:** Update the Core Entity Hierarchy to reflect table/column changes. Update the Performance Optimization Views if any views are changed.
2.  **`docs/3_architecture/02_architecture_diagrams.md`**
    - **Action:** Update the Mermaid ER diagram.

---

### **Trigger: Backend API Routes (`backend/app/api/routes/`)**
*If new endpoints are added, or existing ones are significantly changed:*

1.  **`docs/3_architecture/04_api_design.md`**
    - **Action:** Update the list of key route modules and describe any new architectural patterns. Add examples for the new endpoints if they introduce new patterns.
2.  **`docs/6_advanced/01_security_considerations.md`**
    - **Action:** If the change relates to authentication or authorization, update the relevant sections.

---

### **Trigger: Frontend Routing (`frontend/src/App.tsx`)**
*If new pages (routes) are added or removed:*

1.  **`docs/3_architecture/01_system_architecture_overview.md`**
    - **Action:** Update the list of key pages under the Frontend Architecture section.
2.  **`docs/3_architecture/02_architecture_diagrams.md`**
    - **Action:** Update the Application Data Flow and Component Architecture diagrams.

---

### **Trigger: Frontend Components (`frontend/src/components/` or `frontend/src/pages/`)**
*If a major new component is added or a large one is refactored:*

1.  **`docs/1_introduction/02_project_strengths_and_limitations.md`**
    - **Action:** If a large component from the technical debt list is refactored, remove it from the list.
2.  **`docs/5_frontend_guide/01_design_philosophy.md`**
    - **Action:** If a new component introduces a novel design pattern, update the document.
3.  **`docs/5_frontend_guide/02_state_management.md`**
    - **Action:** If a new state management approach is used, document it.

---

### **Trigger: Shared Modules (`frontend/src/types/`, `frontend/src/utils/` shared modules)**
*If shared modules are added, modified, or extended:*

1.  **`docs/3_architecture/05_shared_modules_pattern.md`**
    - **Action:** Update module descriptions, usage examples, and test coverage information.
2.  **`docs/3_architecture/01_system_architecture_overview.md`**
    - **Action:** Update the shared modules architecture section with new module information.
3.  **`docs/4_development_standards/03_testing_strategy.md`**
    - **Action:** Update test coverage information for new shared module tests.

---

### **Trigger: UI/UX Improvements (auto-save patterns, simplified messaging, etc.)**
*If user interface patterns or user experience improvements are implemented:*

1.  **`docs/5_frontend_guide/01_design_philosophy.md`**
    - **Action:** Update the auto-save patterns, user feedback, or interaction design sections to reflect new UX patterns.

---

### **Trigger: Project Dependencies (`package.json` or `requirements.txt`)**
*If a major new dependency is added:*

1.  **`docs/2_getting_started/01_setup_and_installation.md`**
    - **Action:** Add any new prerequisite installation steps.
2.  **`docs/3_architecture/01_system_architecture_overview.md`**
    - **Action:** Update the technology stack list.

---

### **General Documentation Maintenance**
- When adding a new document, link to it from the main `docs/index.md`.
- Add a YAML frontmatter block to all new documents.
- Review and add cross-links to and from the new document to integrate it with the existing documentation.

## 2. AI-Assisted Commit Workflow

### **"finish commit" Command**
When a developer gives the command `finish commit`, the AI assistant should:

1. **Documentation Review & Updates:**
   - Analyze all changes made during the current development session
   - Update relevant documentation files per the trigger guidelines above
   - Ensure documentation reflects current codebase state
   - Update the "Recent Updates" section in this maintenance guide if significant changes were made

2. **Commit Process:**
   - Generate a 3-8 word summary of the changes for the commit message
   - Use conventional commit format where appropriate (feat:, fix:, docs:, etc.)
   - Execute the git commit with the generated summary
   - Push changes to the remote branch with `git push`

3. **Quality Assurance:**
   - Verify all documentation updates align with actual code changes
   - Ensure cross-references between documents remain accurate
   - Confirm no documentation drift has been introduced

This workflow ensures consistent documentation maintenance and reduces the manual overhead of keeping docs synchronized with code changes. 