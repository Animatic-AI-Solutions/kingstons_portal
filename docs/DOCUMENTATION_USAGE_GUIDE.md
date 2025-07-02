---
title: "Documentation Usage Guide"
tags: ["meta", "documentation", "guidelines", "standards"]
related_docs:
  - "./MAINTENANCE_GUIDE.md"
  - "./4_development_standards/01_coding_principles.md"
---

# Documentation Usage Guide

**Audience: AI Assistants, Development Team, and Contributors**

This guide establishes the rules and guidelines for creating, maintaining, and using documentation within Kingston's Portal project. It serves as the governance framework for our documentation ecosystem.

## Core Documentation Philosophy

**Documentation should enhance development velocity, not slow it down.** Every document must serve a clear purpose and provide actionable guidance for project-wide decisions.

## 1. Document Creation Rules

### ✅ When to CREATE New Documentation

**Only create new documents if they meet ALL of these criteria:**

1. **Project-Wide Impact**: The content affects multiple files, components, or system layers
2. **Architectural Significance**: The topic influences design decisions across the application
3. **Reusable Guidance**: Multiple developers will reference this information over time
4. **Cross-Component Relevance**: The functionality spans beyond a single page or component

**Examples of VALID new documents:**
- Authentication architecture (affects multiple routes, components, and services)
- Database migration strategies (impacts entire data layer)
- Print system architecture (affects report generation across multiple pages)
- Performance optimization patterns (applies to multiple components)
- Security protocols (system-wide implementation)

### ❌ When NOT to Create New Documentation

**Do NOT create new documents for:**

1. **Single-File Functionality**: Features implemented in only one component/page
2. **Component-Specific Logic**: Business logic contained within one React component
3. **Temporary Solutions**: Quick fixes or experimental implementations
4. **API Endpoint Details**: Individual route implementations (use code comments instead)
5. **Bug Fix Procedures**: Issue-specific solutions (use GitHub issues/PRs)

**Examples of INVALID new documents:**
- "How to use the ClientDetails component"
- "AddFund page implementation guide" 
- "Fixing the portfolio calculation bug"
- "ProductIRRCalculation component state management"

## 2. Documentation Usage Guidelines

### For Development Tasks

#### Before Starting Any Multi-File Refactor:
1. **Review Architecture Docs** (`docs/3_architecture/`) for system design patterns
2. **Check Development Standards** (`docs/4_development_standards/`) for coding principles
3. **Consult Frontend Guide** (`docs/5_frontend_guide/`) for UI/UX patterns
4. **Reference Performance Docs** (`docs/6_advanced/`) for optimization guidelines

#### Before Making Architectural Changes:
1. **Read existing architecture documents** to understand current patterns
2. **Follow SPARC methodology** (Specification → Pseudocode → Architecture → Refinement → Completion)
3. **Update corresponding docs** if your changes affect project-wide patterns
4. **Use shared modules** and established patterns where possible

#### For Coding Consistency:
- **Always refer to Development Standards** before writing new code
- **Follow naming conventions** established in the standards
- **Apply security principles** consistently across components
- **Maintain the ≤500 lines per file limit** 

### For AI Assistants

#### Documentation Hierarchy (Priority Order):
1. **Development Standards** - Primary guidance for all coding tasks
2. **Architecture Docs** - For system design and component interactions  
3. **Frontend Guide** - For UI/UX and React-specific implementations
4. **Advanced Topics** - For specialized functionality (security, performance)
5. **Getting Started** - For environment and setup context

#### When Implementing Features:
- **Start with SPARC methodology** from development standards
- **Reference architecture patterns** before designing new components
- **Follow established conventions** rather than creating new patterns
- **Update MAINTENANCE_GUIDE.md** if adding new architectural concepts

## 3. Additional Documentation Rules

### Documentation Quality Standards

#### Writing Standards:
- **Clear, Actionable Language**: Every document must provide specific, implementable guidance
- **SPARC-Aligned Structure**: Follow Specification → Pseudocode → Architecture → Refinement → Completion
- **Mermaid Diagrams**: Use visual diagrams for complex system interactions
- **Code Examples**: Include practical implementation examples
- **Cross-References**: Link to related documents using relative paths

#### Technical Standards:
- **YAML Frontmatter**: All documents must include title, tags, and related_docs
- **File Naming**: Use descriptive, underscore-separated names (e.g., `01_coding_principles.md`)
- **Location Logic**: Place documents in the most relevant category directory
- **Version Control**: Document changes through git commits, not version numbers in files

### Content Governance

#### Document Lifecycle:
1. **Creation**: Must meet project-wide impact criteria
2. **Review**: Technical accuracy and alignment with existing patterns
3. **Integration**: Cross-link with related documents
4. **Maintenance**: Update when corresponding code changes (see MAINTENANCE_GUIDE.md)
5. **Retirement**: Archive documents that become obsolete

#### Consistency Requirements:
- **Terminology**: Use consistent terms across all documentation
- **Code Style**: Follow project coding standards in all examples
- **Architecture Patterns**: Align with established system design
- **Security Practices**: Never include hardcoded secrets or credentials

## 4. Document Organization Principles

### Directory Structure Logic:
```
docs/
├── 1_introduction/          # Project context and goals
├── 2_getting_started/       # Setup and installation
├── 3_architecture/          # System design and patterns
├── 4_development_standards/ # Coding principles and conventions
├── 5_frontend_guide/        # UI/UX and React patterns
├── 6_advanced/              # Specialized topics
├── MAINTENANCE_GUIDE.md     # Documentation maintenance procedures
└── DOCUMENTATION_USAGE_GUIDE.md # This document
```

### Content Categorization:
- **Introduction**: High-level project understanding
- **Getting Started**: Practical setup procedures
- **Architecture**: System design decisions affecting multiple components
- **Development Standards**: Code quality and consistency rules
- **Frontend Guide**: User interface and React-specific patterns
- **Advanced**: Specialized functionality (security, performance, deployment)

## 5. Implementation Workflow

### For New Features:
1. **Check existing docs** for relevant patterns
2. **Follow development standards** for implementation
3. **Document ONLY if project-wide impact**
4. **Update maintenance guide** if new architectural concepts introduced

### For Refactoring:
1. **Review architecture docs** to understand current patterns
2. **Apply SOLID principles** from development standards
3. **Maintain consistency** with established conventions
4. **Update docs** if architectural patterns change

### For Bug Fixes:
1. **Use development standards** for code quality
2. **Follow testing strategies** from standards
3. **Document in code comments**, not separate files
4. **No new docs** for single-issue fixes

## 6. Common Anti-Patterns to Avoid

### Documentation Anti-Patterns:
❌ **Feature Documentation**: Creating docs for single-component features  
❌ **Code Duplication**: Repeating information that exists in code comments  
❌ **Temporary Fixes**: Documenting quick hacks or workarounds  
❌ **Over-Documentation**: Creating docs for self-explanatory code  
❌ **Stale Documentation**: Not updating docs when code changes  

### Development Anti-Patterns:
❌ **Ignoring Standards**: Implementing without checking development standards  
❌ **Architecture Drift**: Creating new patterns without architectural justification  
❌ **Inconsistent Naming**: Not following established naming conventions  
❌ **Security Violations**: Hardcoding secrets or bypassing security principles  

## 7. Success Metrics

### Documentation Effectiveness:
- **Reduced Onboarding Time**: New developers can start contributing faster
- **Consistent Code Quality**: Adherence to established patterns increases
- **Architectural Coherence**: System design remains coherent as project grows
- **Development Velocity**: Decisions can be made quickly using established guidance

### Quality Indicators:
- **High Cross-Reference Usage**: Documents actively link to each other
- **Code Pattern Consistency**: Similar implementations across different components
- **Security Compliance**: Consistent application of security principles
- **Maintainable Architecture**: System design supports future growth

## 8. Enforcement and Accountability

### For AI Assistants:
- **Always consult development standards** before writing code
- **Reference architecture docs** for system design decisions
- **Update documentation** when making project-wide changes
- **Follow SPARC methodology** for all implementations

### For Development Team:
- **Document Review**: Include documentation updates in code reviews
- **Architecture Discussions**: Reference existing docs in design discussions
- **Consistency Checks**: Verify alignment with established patterns
- **Maintenance Responsibility**: Update docs when making architectural changes

## Conclusion

This documentation system is designed to **accelerate development** while **maintaining consistency** and **architectural integrity**. By following these guidelines, we ensure that our documentation serves as a valuable development tool rather than a maintenance burden.

**Remember**: Good documentation enhances development velocity. If a document doesn't help developers make better decisions faster, it shouldn't exist.

---

**Key Principle**: Document the architecture, not the implementation. Code should be self-documenting for implementation details, while documentation should guide system-wide decisions and patterns.

