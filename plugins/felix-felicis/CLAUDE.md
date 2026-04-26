# felix-felicis

Claude Code plugin for everyday automation tasks.

## Architecture

Pure skill-based plugin — no hooks, no build step, no runtime dependencies.
Skills live in `skills/<skill-name>/SKILL.md`.

## Skills

- **make-me-awesome** — Analyzes a GitHub repo and submits it to an awesome list via PR or issue.
- **outlook-invitation** — Creates a German Outlook meeting invitation ready to copy-paste or auto-fill into a calendar event (macOS).

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
