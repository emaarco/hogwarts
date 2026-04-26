# felix-felicis

A Claude Code plugin for everyday automation tasks.

## Skills

### `/make-me-awesome [REPO_TO_PROMOTE] [AWESOME_LIST_REPO]`

Analyzes a GitHub repository and adds it to an awesome list by submitting a PR or issue. Researches the repo, identifies the best-fit category, drafts the entry and submission body, confirms with you, then opens the PR or issue automatically.

### `/outlook-invitation`

Creates a professional German Outlook meeting invitation with context, goals, agenda, and emojis — ready to copy-paste or auto-fill into a new calendar event (macOS auto-fill requires Terminal accessibility permission).

## Rules

The following rules are bundled as plugin commands and auto-activate when you work on matching file types.

### BPMN Image Export (`**/*.bpmn`)

Instructs Claude to use `npx bpmn-to-image` when generating images from BPMN files, with output placed under the module's `assets/` directory.

### Kotlin Code Style (`**/*.kt`)

Enforces collection literal formatting (one element per line when multi-line) and prefers function-body style over expression-body style for multi-line functions.

## License

MIT
