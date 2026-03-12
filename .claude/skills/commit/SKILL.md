---
name: commit
description: Create a git commit. Use when the user runs /commit or asks to commit changes. Stages files, drafts a commit message, confirms with the user before executing — unless the user explicitly asks to skip confirmation (e.g. "just commit", "commit now", "no confirmation").
---

## Context (gathered at invocation)

Run these before doing anything:

- `git status` — see what's modified/untracked
- `git diff HEAD` — full diff
- `git branch --show-current` — current branch
- `git log --oneline -10` — recent commits (for message style reference)

## Phase 1 — Prepare (do immediately, no prompting)

1. Stage the relevant files with `git add`
2. Draft a commit message following Conventional Commits format (see below)
3. Present to the user:
   - **Files to be committed** (from `git status` after staging)
   - **Proposed commit message** (exact text)
4. Ask: **"Proceed with this commit? (yes / edit / cancel)"**

## Phase 2 — Execute (after confirmation)

- **yes** / clear affirmation → run `git commit` with the drafted message
- **edit** / correction → incorporate the user's change to the message, then commit
- **cancel** / **no** → stop, do nothing

**Skip Phase 2 confirmation entirely** if the user's original request explicitly says something like "commit now", "just commit", "skip confirmation", or similar.

## Conventional Commits format

```
<type>[(scope)][!]: <description>

[optional body]

[optional footer(s)]
```

**Types:**

| Type       | When to use                                      |
|------------|--------------------------------------------------|
| `feat`     | New feature                                      |
| `fix`      | Bug fix                                          |
| `docs`     | Documentation only                               |
| `style`    | Formatting, whitespace (no logic change)         |
| `refactor` | Code restructure, no feature/fix                 |
| `perf`     | Performance improvement                          |
| `test`     | Adding or updating tests                         |
| `build`    | Build system or dependency changes               |
| `ci`       | CI/CD configuration                              |
| `chore`    | Maintenance tasks, tooling, config               |

**Scope:** optional, in parentheses — the subsystem or module affected, e.g. `feat(auth):`, `fix(api):`.

**Breaking changes:** append `!` before the colon, e.g. `feat(auth)!: remove legacy login`. Optionally add a `BREAKING CHANGE:` footer with details.

**Rules:**
- Subject line ≤ 72 characters, lowercase after the colon, no period at end
- Body (if needed): wrapped at 72 chars, separated from subject by blank line
- Always append this trailer: `Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>`
