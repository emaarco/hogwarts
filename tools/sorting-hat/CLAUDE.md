# Sorting Hat — Contributor Notes

## What this is

Not a Claude Code plugin, not registered in the marketplace and not published (`private`). Dev tooling for this repo: an npm package with one CLI, `sorting-hat`, that validates every plugin of a marketplace and its skills. TypeScript, run by Node 24 without a build step. CI runs it in the `validate-sorting-hat` job.

## Architecture

`bin/sorting-hat.ts [marketplace-dir] → Marketplace → ClaudePluginValidation over the marketplace and every plugin, RuleValidator over every skill → report, exit 1 on any failure`

- Plugins come from the `source` entries of `.claude-plugin/marketplace.json`, skills from `<plugin>/skills/*`.
- `claude plugin validate` comes from the pinned devDependency `@anthropic-ai/claude-code`; its postinstall is approved in `allowScripts`, so a version bump needs that entry bumped too.

## Files

- `bin/sorting-hat.ts` — CLI entrypoint, registers the rules and prints the report
- `lib/marketplace.ts` — `Marketplace`, resolves the plugin folders and skills of one marketplace
- `lib/claude-plugin-validation.ts` — `ClaudePluginValidation`, runs `claude plugin validate` per folder
- `lib/skill.ts` — `Skill`, reads the files and the frontmatter of one skill folder
- `lib/skill-rule.ts` — the `SkillRule` interface every rule implements: a `name` and `check(skill)` returning violation messages
- `lib/rule-validator.ts` — `RuleValidator`, runs every rule against every skill
- `lib/rules/<name>-rule.ts` — one class per rule
- `lib/test-support/` — helpers that create skill folders for tests
- `**/*.test.ts` — co-located tests

## Rules

House rules, stricter than the Agent Skills spec, which allows any files and folders:

- **skill-structure** — `SKILL.md` exists; top-level entries are only `SKILL.md`, `scripts/`, `references/`, `assets/`, `evals/`
- **skill-frontmatter** — `name` matches the folder, is lowercase-kebab and at most 64 characters; `description` is present and at most 1024 characters
- **references-are-markdown** — every file under `references/` is Markdown
- **max-line-count** — no text file exceeds 500 lines

## Adding a rule

Implement `SkillRule` in a new file under `lib/rules/`, add a co-located test and register it in `bin/sorting-hat.ts`.

## Running

```
npm ci
npm test
npm run validate
```

## Scope boundaries

- Rules apply to every plugin, so no plugin-specific rules.
- No runtime dependencies.
