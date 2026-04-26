# felix-felicis

Claude Code plugin for everyday automation tasks.

## Architecture

Pure skill-based plugin — no hooks, no build step, no runtime dependencies.
Skills live in `skills/<skill-name>/SKILL.md`. Path-scoped rules live in `commands/<name>.md`.

## Skills

- **maturity-analysis** — End-to-end repo analysis: project overview, key files, maturity assessment (parallel expert subagents per dimension), and prioritized issues.
- **make-me-awesome** — Analyzes a GitHub repo and submits it to an awesome list via PR or issue.
- **outlook-invitation** — Creates a German Outlook meeting invitation ready to copy-paste or auto-fill into a calendar event (macOS).

## Rules

Path-scoped rules in `commands/` are flat `.md` files with `paths:` frontmatter. Claude Code auto-activates them when matching file types are in scope — no hook or installation step required.

- **bpmn-export** (`**/*.bpmn`) — Use `npx bpmn-to-image` to generate images from BPMN files.
- **kotlin-style** (`**/*.kt`) — Collection literal and function-body style conventions.

## Adding a New Skill

Create `skills/<skill-name>/SKILL.md` with standard frontmatter:

```
---
name: <skill-name>
description: "One-line description shown in command discovery."
allowed-tools: AskUserQuestion
---
```

## Scope Boundaries

- No hooks — this plugin does not intercept tool calls or session events
- No external dependencies — skills use only standard Claude Code tools (Bash, WebFetch, AskUserQuestion)
- Skills must remain generic — no company-specific context, credentials, or private system references
