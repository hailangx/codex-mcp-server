# GitHub Copilot Instructions  

## Core Guidelines

### Conversation Documentation Requirements

At the end of each significant conversation or work session, you MUST:

1. **Create a Summary**
   - Provide a clear, concise summary of what was accomplished
   - Highlight key decisions made and why
   - Document any blockers or issues encountered and how they were resolved

2. **Write a Changelog Entry**
   - Create a detailed changelog file in `changelog/` folder with format: `YYYY-MM-DD-HHmm-short-title.md`
   - Add an entry to `changelog/CHANGELOG.md` with:
     - Timestamp and title linking to the detailed file
     - 3-5 concise bullet points (one line each) summarizing key changes
     - Test results summary (X passing ✅, X skipped ⏭️, X failed ❌)
   - Include all changes, reasons, and technical decisions in the detailed file
   - Use semantic versioning concepts (Added, Changed, Fixed, Removed)

### Changelog Structure

**Main Index** (`changelog/CHANGELOG.md`):
```markdown
## 2025-11-05

### [13:45] [Unit Test Infrastructure Setup](2025-11-05-1345-unit-test-setup.md)
- Key change 1 (concise, 1 line)
- Key change 2 (concise, 1 line)
- Key change 3 (concise, 1 line)
- **Result**: X tests passing ✅, X skipped ⏭️, X failed ❌
```
*Note: Limit to 3-5 bullet points max. Keep each point to one line. Link to detailed file for full context.*

**Detailed Entry** (`changelog/YYYY-MM-DD-HHmm-short-title.md`):
```markdown
# [YYYY-MM-DD HH:mm] - Short Title of Change

## Summary
Brief overview of what was accomplished and why.

## Changes Made

### Added
- New features or capabilities with file paths

### Changed
- Modifications to existing functionality with reasons

### Fixed
- Bug fixes and issue resolutions

### Removed
- Deprecated or removed features

## Technical Details
- Key technical decisions and rationale
- Architecture changes
- Performance improvements
- Actor isolation decisions
- API changes

## Test Results
- X tests passed ✅
- X tests skipped ⏭️ (with reasons)
- X tests failed ❌

## Impact
- What components were affected
- Breaking changes (if any)
- Migration needed (if any)

## Next Steps
- Incomplete work
- Follow-up tasks
- Technical debt to address
```

## Project-Specific Rules

### Git Workflow
- **Always create a feature branch** from `main` before making code changes
- Branch naming: `feature/<short-description>` or `fix/<short-description>`
- Commit changes incrementally with clear, descriptive commit messages
- Work and commit exclusively in the feature branch
- **Do NOT merge to main** unless explicitly asked or agreed upon by the user
- Keep commits atomic and focused on specific changes

### iOS Development
- Always test changes with the simulator before marking complete
- Run unit tests after significant code changes
- Update test files when modifying core functionality
- Document any Xcode project configuration changes

### Code Quality
- Maintain Swift best practices (actors, async/await, protocols)
- Keep test coverage for critical algorithms (hashing, duplicate detection, clustering)
- Document actor isolation decisions
- Ensure backward compatibility with deployment target (iOS 16.0+)

### Design Documentation
- **Always review design documents** in `design/` folder before making architectural changes
- **Update design documents** when code changes affect:
  - System architecture or component interactions
  - API contracts or protocols
  - Data models or persistence layer
  - Feature specifications or user flows
- Read relevant design docs to understand context before implementing changes
- Keep design docs and code in sync - treat design docs as living documentation

### File Management
- Never create unnecessary documentation files unless requested
- Update existing documentation rather than creating new files
- Keep project structure clean and organized
- Remove commented-out code after verification

### Testing Protocol
1. Run unit tests first 
2. Then run integration tests on simulator
3. Document test results (passed/failed/skipped counts)
4. Note any skipped tests and explain why

## Workflow Expectations

### For Major Features and Refactors

**Use Changelog as Planning and Memory Tool:**

1. **Before Starting Work**:
   - Create a detailed changelog file in `changelog/` folder immediately
   - List out the complete plan with all steps and components to change
   - Add status tracking (Not Started, In Progress, Completed) for each step
   - Document expected challenges and decision points

2. **During Work (Incremental Updates)**:
   - Update the changelog file as you complete each step
   - Mark steps as "In Progress" when starting, "Completed" when done
   - Add notes about unexpected issues or changes to the plan
   - Document decisions made and their rationale in real-time
   - Use the changelog as intermediate memory across tool calls

3. **After Completing Work**:
   - Refine the changelog to be clear and coherent
   - Remove planning artifacts and status markers
   - Add final test results and impact assessment
   - Update `changelog/CHANGELOG.md` with concise summary entry

**Example Planning Changelog Structure:**
```markdown
## Plan
- [ ] Step 1: Description
- [ ] Step 2: Description
- [x] Step 3: Description (Completed)
- [🔄] Step 4: Description (In Progress)

## Progress Log
[Track updates as work progresses]

## Final Summary
[Refined summary after completion]
```

### Before Ending a Session
- [ ] Verify tests are passing
- [ ] Summarize what was accomplished
- [ ] Update CHANGELOG.md with all changes
- [ ] Document any incomplete work or next steps
- [ ] Note any technical debt or improvements needed

### When Making Changes
- Use `replace_string_in_file` with 3-5 lines of context
- Check current file state before editing (files may have been modified)
- Test changes immediately after implementation
- Document why changes were necessary, not just what changed
- For major work: update the changelog incrementally as you progress

## Communication Style

- Be concise and direct
- Use emojis only when explicitly requested
- Focus on facts and actionable information
- Provide test results with metrics (timing, pass/fail counts)
- Explain technical decisions clearly

## Change Tracking

Every conversation that results in code changes should be tracked with:
- **What**: Brief description of the change
- **Why**: Reason for the change
- **How**: Technical approach used
- **Impact**: What components/tests were affected
- **Status**: Complete, In Progress, or Blocked

## Example Documentation

```markdown
## Session: 2025-11-05 - Unit Test Infrastructure Setup

### Summary
Successfully configured and ran unit tests for AlbumCopilot iOS app. Fixed actor isolation 
issues, removed conflicting test files, and established working test infrastructure.

### Changes Made
- Modified HashService to add `nonisolated` keyword for test access
- Created SimpleUnitTests.swift with 5 basic tests
- Removed problematic test files with API mismatches
- Updated Xcode project configuration

### Test Results
- 9 tests passed ✅
- 3 tests skipped (due to missing simulator data)
- 0 tests failed ❌

### Next Steps
- Fix comprehensive unit tests to match actual API signatures
- Update integration tests with correct method names (scanLibrary vs scanPhotos)
- Add sample photos to simulator for full integration testing
```

---

**Remember**: Documentation is as important as the code. Always leave a clear trail of what was done and why.
