# Test Fix Escalation Procedure

## Time Limits

### Per-Test Investigation
- **Maximum Time**: 30 minutes per individual test
- **Action**: If root cause unclear after 30 min, document state and move to next test

### Per-Task/Phase
- **Maximum Time**: 90 minutes per task or phase
- **Action**: If stuck on phase after 90 min, review approach and consider alternatives

### Total Blocked Time
- **Maximum Time**: 3 hours cumulative across all phases
- **Action**: STOP, document all progress, escalate to project maintainer

## Escalation Triggers

### Immediate Escalation
1. **Test failure root cause unclear** after 30 min investigation
2. **TypeScript compilation errors** preventing test execution
3. **Circular dependency errors** in testUtils
4. **More than 5 new test failures** introduced by testUtils
5. **Performance degradation** (tests taking >5 min to run full suite)
6. **Module resolution failures** that persist after standard troubleshooting

### Review & Reconsider (60 min)
1. **Single test stuck** for 60 minutes
2. **Phase taking 2x estimated time**
3. **Repeated failures** in same test after multiple fix attempts

### Hard Stop (3 hours cumulative)
1. **Total blocked time** exceeds 3 hours
2. **No progress** for 90 consecutive minutes
3. **Systematic failures** suggesting architectural issues

## Escalation Actions

### Step 1: Document Current State
```markdown
## Escalation Report - [Date/Time]

### Current Phase
- Phase: [Phase number and name]
- Task: [Task number and description]
- Time spent: [Minutes]

### What Was Attempted
1. [Action 1]
2. [Action 2]
3. [Action 3]

### Error Messages (Full Stack Traces)
```
[Paste complete error output]
```

### Files Modified
- File 1: [path] - [description of changes]
- File 2: [path] - [description of changes]

### Git Diff Output
```
[Paste git diff output]
```

### Current Test Status
- Passing: X/146
- Failing: Y/146
- New failures introduced: Z
```

### Step 2: Revert to Last Known Good State
```bash
# If smoke tests are currently broken
npm test -- --testPathPattern="(reportFormatters|reportConstants|ReportFormatter)" --no-coverage

# If smoke tests fail, revert changes
# (Note: User indicated not to use git, so document changes to manually revert)

# Re-run smoke tests to verify baseline restored
npm test -- --testPathPattern="(reportFormatters|reportConstants|ReportFormatter)" --no-coverage
```

### Step 3: Contact & Escalation Path
**Contact**: Project maintainer or team lead

**Provide**:
- Escalation Report (from Step 1)
- TEST_FAILURE_LOG.md
- SETUPTEST_ANALYSIS.md
- test_baseline.txt
- Exact error messages with full stack traces
- Reproduction steps (commands run in order)

**Include**:
- Environment info: Node version, npm version, OS
- Dependency versions: Jest, React Testing Library, React Query
- Any recent changes to project structure

### Step 4: Decision Points

#### 1 Hour Stuck
- **Action**: Review approach, search for similar issues
- **Consider**: Alternative implementation patterns
- **Document**: Current blockers in TEST_FAILURE_LOG.md
- **Decision**: Continue with alternative approach OR escalate

#### 2 Hours Stuck
- **Action**: STOP current work, revert changes if possible
- **Seek**: Help from team member or online resources
- **Document**: Complete escalation report
- **Decision**: Wait for guidance OR move to different phase

#### 3 Hours Stuck (HARD STOP)
- **Action**: STOP all work immediately
- **Escalate**: To project maintainer with full report
- **Wait**: For guidance before proceeding
- **Do NOT**: Continue attempting fixes or workarounds

## Rollback Procedures

### If testUtils Breaks Existing Tests

```bash
# Check smoke test status
npm test -- --testPathPattern="(reportFormatters|reportConstants|ReportFormatter)" --no-coverage

# If smoke tests fail:
# 1. Document which smoke tests are failing
# 2. Identify files changed since last smoke test pass
# 3. Manually revert testUtils-related changes
# 4. Re-run smoke tests to verify restoration

# If baseline restored, re-evaluate testUtils design
```

### If Stuck on Single Test for >30 Minutes

**Decision Tree**:
1. **Document current state** in TEST_FAILURE_LOG.md
   - What was tried
   - Current error state
   - Suspected root cause

2. **Mark test as "BLOCKED"** in log
   - Add "Deferred to Phase 6" note
   - Include time spent so far

3. **Move to next test** in priority list
   - Come back with fresh perspective later
   - May become clear after fixing other tests

4. **If >3 tests stuck** → ESCALATE per procedure above

### If Timeline Exceeds 10 Hours

**Partial Success Strategy**:

#### Option 1: Merge What Works (if at 90%+ passing)
- **Criteria**: testUtils validated, ClientDetails fixed, PrintService fixed
- **Action**: Consider success threshold met (90%+ = 131+ tests passing)
- **Document**: Remaining issues in TEST_FAILURE_LOG.md
- **Create**: Follow-up tickets for deferred tests

#### Option 2: Extend Timeline (if progress is steady)
- **Criteria**: Clear progress being made, no hard blockers
- **Action**: Request 2-4 hour extension
- **Ensure**: Realistic completion estimate with new timeline

#### Option 3: Abort and Revert (if fundamentally blocked)
- **Criteria**: Systematic failures, architectural issues detected
- **Action**: Restore baseline, document findings
- **Recommend**: Alternative approach or architectural changes needed

## Success Criteria Reminder

### Minimum Viable (90%)
- 131+/146 tests passing (90%+)
- Coverage: 60%+
- No regressions (all 120 baseline tests still pass)
- testUtils validated (10+ isolation tests passing)

### Target (95%)
- 139+/146 tests passing (95%+)
- Coverage: 70%+
- Smoke tests stable (5 consecutive runs)
- All component tests using testUtils

### Stretch (100%)
- 146/146 tests passing (100%)
- Coverage: 75%+
- Comprehensive documentation
- Migration guide created

## Emergency Contacts

**Project Repository**: C:\Users\jacob\Documents\kingstons_portal
**Documentation**: docs/ folder (comprehensive project documentation)
**Codebase Owner**: [To be filled in by user if needed]

## Notes

- This is a comprehensive 8-10 hour plan
- Escalation is NOT failure - it's risk management
- Better to escalate early than waste hours on blocked issues
- Document everything for knowledge transfer
