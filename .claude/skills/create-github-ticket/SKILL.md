---
name: create-github-ticket
description: Helps create well-structured GitHub Issues for feature requests, bug reports, and tasks. Use this skill whenever the user wants to create a GitHub issue, ticket, or bug report, or says things like "create an issue", "make a ticket", "report a bug", "add a feature request", or "log a task". Always use this skill when GitHub Issues are mentioned, even if the request is brief.
---
 
# GitHub Issue Creator
 
Help the user create a clear, well-structured GitHub Issue. The output should be ready to copy-paste directly into GitHub, or optionally pushed via GitHub CLI.
 
## Workflow
 
### 1. Gather information
 
If the user hasn't provided enough detail, ask for:
- **What type of issue?** (bug report / feature request / task)
- **Short description** — what is the problem or goal?
- **Context** — which repo, component, or area of the codebase?
- Any relevant details (steps to reproduce, expected vs actual behavior, etc.)
Don't ask for everything at once — if the user gave a rough description, extract what you can and ask only for what's missing.
 
### 2. Generate the issue
 
Write the issue in English using the appropriate template below.
 
---
 
## Templates
 
### Bug Report
 
**Title:** `[Bug] <short description>`
 
```markdown
## Description
A clear and concise description of the bug.
 
## Steps to Reproduce
1. Go to '...'
2. Click on '...'
3. See error
 
## Expected Behavior
What you expected to happen.
 
## Actual Behavior
What actually happened.
 
## Environment
- OS: 
- Browser / Runtime: 
- Version: 
 
## Additional Context
Any screenshots, logs, or other relevant information.
```
 
---
 
### Feature Request
 
**Title:** `[Feature] <short description>`
 
```markdown
## Summary
A clear and concise description of the feature.
 
## Problem / Motivation
What problem does this solve? Why is it needed?
 
## Proposed Solution
Describe how you envision this working.
 
## Alternatives Considered
Any other approaches you thought about.
 
## Additional Context
Mockups, examples, or related issues.
```
 
---
 
### Task
 
**Title:** `[Task] <short description>`
 
```markdown
## Objective
What needs to be done and why.
 
## Acceptance Criteria
- [ ] Criterion 1
- [ ] Criterion 2
- [ ] Criterion 3
 
## Additional Context
Any relevant background, links, or dependencies.
```
 
---
 
## 3. Suggest labels
 
Based on the issue type, suggest appropriate GitHub labels:
- Bug report → `bug`, `needs-triage`
- Feature request → `enhancement`, `discussion`
- Task → `task`, `chore`
Also suggest a **milestone** or **assignee** if the user has mentioned one.
 
---
 
## 4. Optional: Push via GitHub CLI
 
If the user wants to create the issue directly (not just copy-paste), generate the `gh` CLI command:
 
```bash
gh issue create \
  --title "<title>" \
  --body "<body>" \
  --label "<label>" \
  --repo <owner>/<repo>
```
 
Ask the user for the repo name if not already known (`owner/repo` format).
 
---
 
## Tips
 
- Keep titles short and scannable (under 72 characters)
- Use checkboxes for acceptance criteria in tasks
- For bugs, always ask for steps to reproduce — without them the issue is hard to act on
- If the user is in a hurry, generate a reasonable draft and let them edit rather than asking many questions
 