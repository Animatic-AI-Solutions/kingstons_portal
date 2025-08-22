---
title: "Frontend Design Philosophy"
tags: ["frontend", "design", "ux", "ui", "accessibility"]
related_docs:
  - "./02_state_management.md"
  - "../1_introduction/01_project_goals.md"
---
# Frontend Design Philosophy

This document outlines the core design and user experience (UX) principles for the Kingston's Portal frontend. Our primary goal is to create an application that is not only powerful but also intuitive, accessible, and efficient for our target users: experienced wealth management advisors.

## 1. Guiding Principles

- **Clarity:** The interface must be clear and unambiguous. Labels, actions, and data should be presented in a way that is immediately understandable.
- **Readability:** As our user base may include individuals aged 50+, readability is paramount. This informs our choices in typography, color, and spacing.
- **Simplicity:** We aim to reduce cognitive load by creating intuitive navigation, minimizing unnecessary complexity, and using familiar UI patterns.
- **Efficiency:** The application should be designed to support and streamline the daily workflows of our advisors.

## 2. Visual Design System

### Typography
- **Base Font Size:** A minimum of **16px** for body text to ensure easy reading without zooming.
- **Headings:** Use a clear typographic scale to establish a strong visual hierarchy. Headings should be significantly larger than body text.
- **Font Family:** A clean, legible sans-serif font is used throughout the application.

### Color Palette
- **High Contrast:** We adhere to WCAG 2.1 AA standards for color contrast. Important text and UI elements use near-black or dark blue text on light backgrounds (white or very light grey).
- **Avoid Ambiguity:** We **do not** rely on color alone to convey information (e.g., success/error states, IRR changes). Color is always paired with icons, text labels, or other visual cues.
- **Theme Colors:** Provider-specific theme colors are used tastefully to add visual context but are not used for critical information where contrast could be compromised.

### Layout and Spacing
- **Ample White Space:** We use generous spacing to prevent the UI from feeling cluttered and to create clear visual separation between elements.
- **Consistent Layouts:** Pages follow consistent layout patterns (e.g., placement of headers, actions, and filters) to create a predictable user experience.
- **Responsive Design:** The application uses a mobile-first approach with a flexible grid system to ensure usability across a range of screen sizes.

## 3. Interaction Design

- **Large Click Targets:** Buttons, links, and other interactive elements have large clickable areas (minimum 44x44 pixels) to be easily usable on both desktop and touch devices.
- **Clear Affordances:** Interactive elements are clearly identifiable. Buttons look like buttons, and links are clearly distinguished.
- **Visual Feedback:** The UI provides immediate feedback for user actions, such as hover states, click effects, and loading indicators for asynchronous operations.
- **Clear Calls-to-Action (CTAs):** Primary actions on any given page (e.g., `Save`, `Add Client`) are prominently displayed and clearly labelled.
- **Expanded Interaction Areas:** When feasible, entire rows or sections are made clickable rather than restricting interaction to small UI elements (e.g., clicking anywhere on a data row to toggle selection, not just the checkbox).

## 4. Auto-Save Patterns and User Feedback

### Auto-Save Implementation
- **Seamless Experience:** Critical user inputs (such as notes and form data) automatically save without requiring manual intervention, reducing the risk of data loss and cognitive overhead.
- **Immediate Feedback:** Users receive subtle visual confirmation when data is being saved (e.g., "Saving..." indicators) without intrusive notifications.
- **Reduced Friction:** By eliminating manual save requirements, users can focus on their primary tasks rather than data management concerns.

### Simplified User Messaging
- **Concise Warnings:** Error and warning messages focus on essential information, avoiding verbose details that may overwhelm users.
- **Actionable Feedback:** Messages provide clear guidance on what action (if any) the user needs to take.
- **Progressive Disclosure:** Complex information is revealed progressively, with summary information presented first and details available on demand.

### Smart Data Formatting
- **Intelligent Precision:** Financial data displays with smart decimal formatting that removes unnecessary trailing zeros while maintaining required precision (e.g., "5%" instead of "5.00%", "5.1%" instead of "5.10%").
- **Context-Appropriate Precision:** Different data types use appropriate decimal places (fund IRRs: up to 2 decimal places, portfolio total IRRs: up to 1 decimal place) while removing unnecessary zeros.
- **Clean Display:** Numbers are presented in their most readable form without sacrificing accuracy or professional appearance.
- **Consistent Date Formatting:** Standardized date formatting across report tables ensures visual consistency (e.g., valuation and IRR column headers both use "Month YYYY" format rather than mixing full dates with abbreviated formats).
- **Validated Implementation:** Smart formatting functionality has been verified through comprehensive test coverage - tests confirm that "10%" is correctly displayed instead of "10.0%" when trailing zeros are unnecessary.

### Enhanced Relationship Visibility
- **Product Owner Context:** Product cards display associated product owners directly on the card for immediate relationship recognition without requiring additional navigation.
- **Aggregate Relationship Views:** Client detail pages automatically aggregate and display all unique product owners across all client products, providing comprehensive relationship overview.
- **Real-Time Data Synchronization:** Product owner relationships update automatically when products are modified, ensuring relationship data remains current and accurate.

### Proactive Input Validation
- **Real-Time Filtering:** Input fields proactively prevent invalid characters from being entered, providing immediate feedback rather than post-submission validation.
- **Clear Guidance:** Helper text and placeholders inform users about input restrictions before they encounter errors (e.g., "letters, spaces, hyphens, and apostrophes only").
- **Contextual Restrictions:** Input validation is tailored to the specific data type (e.g., name fields restrict numbers and special characters, maintaining data quality while supporting common name formats like "O'Connor" and "Anne-Marie").

### Context-Aware Form Behavior
- **Intelligent Auto-Population:** Forms intelligently pre-populate fields based on navigation context, auto-filling data only when it logically supports the user's workflow.
- **Navigation-Based Logic:** The system recognizes where users came from and adapts form behavior accordingly (e.g., client selection auto-populates only when navigating from client details, not from general navigation).
- **Security-Conscious:** Auto-population includes validation checks to prevent URL manipulation and ensure data integrity.

### Intelligent Workflow Assistance
- **Historical Data Inheritance:** Forms automatically inherit relevant data from previous workflows to reduce repetitive data entry (e.g., portfolio generation creation auto-selects funds and weightings from the most recent generation).
- **Contextual Defaults:** When creating new instances of existing patterns, the system provides intelligent defaults based on the latest successful configuration.
- **Progressive Enhancement:** Users can immediately see inherited configurations and modify them as needed, rather than starting from scratch.

## 5. Accessibility

Accessibility is a core requirement, not an afterthought.
- **WCAG 2.1 AA:** Our target for compliance.
- **Semantic HTML:** We use semantic HTML5 elements (`<nav>`, `<main>`, `<button>`, etc.) to improve screen reader compatibility.
- **Keyboard Navigability:** All interactive elements are reachable and operable via the keyboard.
- **Alternative Text:** All meaningful images and icons have descriptive alt text.

## 6. UI Components

We leverage a rich library of over 40 reusable UI components to ensure consistency and speed up development. Key components in `frontend/src/components/ui/` include:
- **Data Display:** `DataTable`, `StatBox`, `FundDistributionChart`
- **Inputs:** `BaseInput`, `DateInput`, `SearchableDropdown`
- **Actions:** `Button`, `ActionButton`, `DeleteButton`

By adhering to this design philosophy, we aim to create a user interface that feels professional, trustworthy, and easy to use. 