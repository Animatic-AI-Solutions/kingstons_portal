---
title: "Documentation Maintenance Guide"
tags: ["meta", "maintenance", "documentation"]
---
# Documentation Maintenance Guide

**Audience: AI Assistant & Development Team**

This document is a manifest designed to guide developers and AI assistants in keeping the project's documentation synchronized with its codebase. It maps key project files and concepts to their corresponding documentation files.

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