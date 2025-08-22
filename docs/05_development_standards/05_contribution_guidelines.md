---
title: "Contribution Guidelines"
tags: ["standards", "development", "git", "workflow", "pull_request"]
related_docs:
  - "./01_coding_principles.md"
  - "./02_naming_conventions.md"
  - "./03_testing_strategy.md"
---
# Contribution Guidelines

Thank you for contributing to the Kingston's Portal project! To ensure a smooth and collaborative development process, please adhere to the following guidelines.

## 1. Team Development Environment

### Development Team Structure
- **Team Size:** 2 developers working collaboratively on separate laptops
- **Development Tools:** Cursor IDE with AI coding assistants
- **Collaboration Model:** Distributed development with frequent Git synchronization
- **Communication:** Git commit messages, pull requests, and direct communication

### AI-Assisted Development Guidelines
- **Leverage AI Tools:** Use Cursor's AI capabilities and coding assistants to enhance productivity and code quality
- **Code Review:** All AI-generated code must undergo human review before merging
- **Documentation:** Use AI assistance for generating and maintaining comprehensive documentation
- **Consistency:** Ensure AI-assisted code follows established project patterns and coding standards
- **Learning:** Use AI tools to explore best practices and learn new techniques while maintaining code quality
- **Problem-Solving Collaboration:** AI assistants excel at systematic debugging, code analysis, and comprehensive problem resolution when working collaboratively with developers
- **Real-Time Issue Resolution:** Complex issues like data duplication, API synchronization, and UX consistency can be effectively resolved through iterative AI-assisted development sessions

## 2. Getting Started

Before you begin, please make sure you have read the following documents:
- [Project Goals](../1_introduction/01_project_goals.md)
- [Setup and Installation](../2_getting_started/01_setup_and_installation.md)
- [Coding Principles](./01_coding_principles.md)
- [Naming Conventions](./02_naming_conventions.md)

## 3. Branching Strategy

We use a simplified GitFlow model optimized for a 2-developer team with frequent collaboration.

- **`main`:** This branch represents the stable, production-ready version of the application. Direct commits to `main` are not allowed.
- **Feature Branches:** Create a new branch off of `main` for every new feature, bug fix, or chore.
- **Frequent Merging:** Aim to merge feature branches quickly (same day or next day) to minimize merge conflicts
- **Branch Naming:** Branches should be named according to the [Naming Conventions](./02_naming_conventions.md).
  - **Examples:**
    - `feature/PROJ-123-add-client-search`
    - `fix/PROJ-124-login-bug`
    - `chore/PROJ-125-update-dependencies`
    - `docs/update-deployment-guide`

### Daily Git Workflow
1. **Start of Day:** Pull latest changes from `main` branch
2. **Create Feature Branch:** Branch off from updated `main` for new work
3. **Regular Commits:** Make small, focused commits throughout the day
4. **End of Day:** Push changes and create pull requests for completed work
5. **Quick Reviews:** Review team member's PRs promptly to maintain development velocity

### Recent Development Success Examples
The team has demonstrated effective collaborative problem-solving capabilities, successfully resolving multiple complex issues in single development sessions:
- **Data Integrity Issues:** Systematic identification and resolution of cash fund duplication across frontend and backend systems
- **UX Consistency Improvements:** Coordinated enhancements to date formatting, product owner visibility, and data aggregation
- **Build Process Optimization:** Rapid diagnosis and resolution of build configuration issues
- **Real-Time Collaboration:** Effective use of AI-assisted development for comprehensive problem analysis and solution implementation

## 4. Development Process

1.  **Create an Issue:** If one doesn't already exist, create an issue in the project's issue tracker (e.g., Jira, GitHub Issues) that describes the feature or bug.
2.  **Create a Branch:** Create a feature branch from the `main` branch with the appropriate name.
3.  **Code:** Write your code, following the project's [Coding Principles](./01_coding_principles.md) and [Naming Conventions](./02_naming_conventions.md).
4.  **Test:** Write the necessary unit and integration tests to cover your changes, as defined in the [Testing Strategy](./03_testing_strategy.md).
5.  **Commit:** Make small, logical commits with clear, descriptive messages. Follow the git practices outlined in the [Git Workflow](../04_development_workflow/01_git_workflow.md) documentation.

## 5. Submitting a Pull Request

Once your work is complete and tested, you are ready to submit a Pull Request (PR).

1.  **Push your branch** to the remote repository.
2.  **Create a Pull Request** in the GitHub interface, targeting the `main` branch.
3.  **Fill out the PR Template:** The PR description should be clear and concise. It should include:
    - A link to the issue it resolves.
    - A summary of the changes made.
    - Steps for the reviewer to test the changes.
4.  **Assign Reviewers:** Assign at least one other developer to review your code.
5.  **Code Review:** The reviewer will check the code for correctness, adherence to standards, and potential issues. Be prepared to make changes based on the feedback.
6.  **Merging:** Once the PR is approved and all automated checks (e.g., CI tests) have passed, it can be merged into the `main` branch.

## 6. Code of Conduct

All contributors are expected to follow the project's Code of Conduct. Please be respectful and constructive in all communications. 