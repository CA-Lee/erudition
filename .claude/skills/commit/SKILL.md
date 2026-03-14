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

## Atomic Commits

Each commit should represent **one logical change** — reviewable, revertable, and understandable on its own.

**Signs you should split into multiple commits:**
- The diff touches unrelated files or concerns (e.g. a bug fix + a refactor)
- The commit message needs "and" to describe what changed
- Different parts of the diff would need to be reverted independently

**How to split:** use `git add -p` (patch mode) or stage files selectively to isolate each logical unit before committing.

**When multiple files belong together:** it's fine to include several files in one commit if they're part of the same logical change (e.g. a feature + its test + its migration).

## Phase 1 — Prepare (do immediately, no prompting)

1. **Assess atomicity** — review `git diff HEAD` and group changes into logical units. If multiple independent units exist, pick the first logical unit to commit now and leave the rest unstaged.
2. Stage only the files/hunks for this commit's scope — use `git add <specific-files>` or `git add -p` for partial staging. Do **not** stage files belonging to other logical units.
3. Draft a commit message following Conventional Commits format (see below)
4. Present to the user:
   - **Files to be committed** (from `git status` after staging)
   - **Proposed commit message** (exact text)
   - **If changes were split:** note what was left unstaged and why
5. Ask: **"Proceed with this commit? (yes / edit / cancel)"**
   - The user will check the staged files in their IDE or via `git status` to verify before confirming

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
