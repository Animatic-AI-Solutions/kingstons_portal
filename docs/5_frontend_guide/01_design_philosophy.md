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

## 4. Accessibility

Accessibility is a core requirement, not an afterthought.
- **WCAG 2.1 AA:** Our target for compliance.
- **Semantic HTML:** We use semantic HTML5 elements (`<nav>`, `<main>`, `<button>`, etc.) to improve screen reader compatibility.
- **Keyboard Navigability:** All interactive elements are reachable and operable via the keyboard.
- **Alternative Text:** All meaningful images and icons have descriptive alt text.

## 5. UI Components

We leverage a rich library of over 30 reusable UI components to ensure consistency and speed up development. Key components in `frontend/src/components/ui/` include:
- **Data Display:** `DataTable`, `StatBox`, `FundDistributionChart`
- **Inputs:** `BaseInput`, `DateInput`, `SearchableDropdown`
- **Actions:** `Button`, `ActionButton`, `DeleteButton`

By adhering to this design philosophy, we aim to create a user interface that feels professional, trustworthy, and easy to use. 