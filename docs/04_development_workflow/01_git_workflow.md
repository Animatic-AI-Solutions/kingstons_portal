---
title: "Git Workflow and Version Control"
tags: ["git", "version-control", "workflow", "branching"]
related_docs:
  - "./02_code_review_process.md"
  - "./03_testing_procedures.md"
  - "../05_development_standards/01_coding_principles.md"
---

# Git Workflow and Version Control

## Overview

This document outlines the git workflow and version control practices for Kingston's Portal development.

## Branching Strategy

### Main Branch
- `main` - Production-ready code
- Protected branch requiring pull request reviews
- All deployments come from main branch

### Feature Branches
Create feature branches for all development work:

```bash
# Create new feature branch
git checkout main
git pull origin main
git checkout -b feature/your-feature-name
```

**Branch Naming Convention:**
- `feature/feature-name` - New features
- `fix/bug-name` - Bug fixes
- `docs/update-name` - Documentation updates
- `refactor/component-name` - Code refactoring

## Commit Guidelines

### Commit Message Format
Use clear, descriptive commit messages:

```bash
# Good examples
git commit -m "Add client search functionality"
git commit -m "Fix IRR calculation for edge cases"
git commit -m "Update database schema documentation"

# Avoid
git commit -m "Fixed stuff"
git commit -m "Update"
git commit -m "WIP"
```

### Making Commits
1. Stage your changes: `git add .` or `git add specific-file.tsx`
2. Commit with descriptive message: `git commit -m "Your message"`
3. Push to your branch: `git push origin feature/your-branch`

## Pull Request Process

### Creating Pull Requests
1. Push your feature branch to origin
2. Create pull request from feature branch to main
3. Fill out PR description with:
   - Summary of changes
   - Testing performed
   - Any deployment considerations

### PR Review Requirements
- At least 1 reviewer approval required
- All tests must pass
- No merge conflicts
- Code follows project standards

## Daily Workflow

### Starting Development
```bash
# Get latest changes
git checkout main
git pull origin main

# Create feature branch
git checkout -b feature/new-feature

# Make your changes and commit regularly
git add .
git commit -m "Implement feature functionality"
git push origin feature/new-feature
```

### Finishing Development
```bash
# Ensure tests pass
npm test
npm run build

# Push final changes
git push origin feature/new-feature

# Create pull request for review
```

## Best Practices

### Commit Frequency
- Commit early and often
- Each commit should represent a logical unit of work
- Don't wait until end of day to commit

### Code Quality
- Run tests before committing
- Ensure code builds successfully
- Follow project coding standards
- Update documentation when needed

### Post-Fix Cleanup
After fixing an issue or bug, clean up your code:
- **Remove debug logs** created specifically for troubleshooting the issue
- **Remove temporary test scripts** or documentation made only for debugging
- **Only clean up after confirming the fix works** through evidence (tests, manual verification)
- **Update any necessary documentation** that may be affected by the fix:
  - API documentation if endpoints were modified
  - User guides if UI behavior changed
  - Technical documentation if system architecture was affected
  - README files if setup or usage instructions changed
- Keep cleanup as a separate commit for clear history

### Complex Code Documentation
When writing complex nested code blocks:
- **Add comments to mark what each block does** for easier navigation and editing
- **Explain anything not immediately obvious from the code itself** such as:
  - Why you chose one function over a similar alternative
  - Business logic reasoning behind calculations
  - Non-obvious side effects or dependencies
  - Performance or security considerations
- Use clear, descriptive comments that explain the purpose, not just the mechanics
- Example:
  ```typescript
  // Process client portfolio data
  if (clientData.portfolios) {
    // Calculate total portfolio value using reduce for performance over forEach
    // (reduce is faster for large datasets and creates immutable result)
    const totalValue = clientData.portfolios.reduce((sum, portfolio) => {
      // Sum active fund valuations only - excludes lapsed/terminated funds
      // per business requirement to show only current holdings
      const activeFunds = portfolio.funds.filter(fund => fund.status === 'active');
      return sum + activeFunds.reduce((fundSum, fund) => fundSum + fund.valuation, 0);
    }, 0);
  }
  ```

### Branch Management
- Keep feature branches focused and short-lived
- Delete branches after merging
- Regularly sync with main branch

## Deployment Integration

### Production Releases
1. Code merged to main branch
2. Manual deployment when ready
3. Tag releases for tracking:
   ```bash
   git tag -a v1.0.0 -m "Release version 1.0.0"
   git push origin v1.0.0
   ```

## Troubleshooting

### Common Issues

**Merge Conflicts:**
```bash
# Resolve conflicts in affected files
git add .
git commit -m "Resolve merge conflicts"
```

**Need to Update Branch:**
```bash
git checkout main
git pull origin main
git checkout feature/your-branch
git merge main
```

**Accidentally Committed to Main:**
```bash
# Create branch from current state
git checkout -b feature/accidental-work

# Reset main to previous state
git checkout main
git reset --hard origin/main
```

This workflow ensures clean version control practices while maintaining development velocity and code quality.