---
name: contributor-setup
description: "Analyzes a repo's contributor experience and creates or updates what's missing: GitHub issue-form templates (bug/feature/refactor), an open-source target-group-focused README, CONTRIBUTING.md, and the remaining community-health files (PR template, CODE_OF_CONDUCT, SECURITY, LICENSE, CODEOWNERS). Use when asked to make a repo contributor-friendly, open-source ready, or to set up issue templates / README / CONTRIBUTING."
allowed-tools: Bash, Read, Write, Edit, Grep, Glob, WebFetch, AskUserQuestion
---

# Skill: contributor-setup

Audits everything a first-time visitor or contributor touches — README, issue templates, CONTRIBUTING.md, and the surrounding community-health files — then creates what's missing and upgrades what falls short. Analysis always comes first: never overwrite an existing file without showing the user what's wrong with it.

Run this when asked to "make this repo contributor-friendly", prepare a project for open-sourcing, set up issue templates, or as the community slice of a repo maturity audit.

## Phase 1 — Analyze

Start from GitHub's own community-profile scoring, then inspect each file locally:

```bash
gh api repos/{owner}/{repo}/community/profile --jq '{health_percentage, files}'
ls .github/ISSUE_TEMPLATE/ 2>/dev/null
ls .github/PULL_REQUEST_TEMPLATE.md .github/CODEOWNERS CONTRIBUTING.md CODE_OF_CONDUCT.md SECURITY.md LICENSE README.md 2>/dev/null
```

Then judge quality, not just existence. Before writing anything, understand the project well enough to describe it accurately: read the manifest (`package.json` / `pom.xml` / …), the entry points, and any existing docs — the README must reflect what the project actually does, not a generic template.

**README** — evaluate against the target group (the developer who lands on the repo knowing nothing):
- [ ] Answers *what is this and why should I care* in the first screen (one-paragraph pitch, not an architecture essay)
- [ ] States the added value: which problem it solves, for whom, and why to pick it over the obvious alternatives — features alone don't answer this
- [ ] Install / quickstart that works copy-paste
- [ ] A "what you get" section — features, screenshot/GIF for anything visual
- [ ] Badges that carry information (CI status, version, license) — not badge walls
- [ ] Links to CONTRIBUTING.md and LICENSE near the end
- Reference shape (from [wardley-maps-modeler](https://github.com/Miragon/wardley-maps-modeler)): *pitch → Install → What you get → structure/packages → Contributing → License*

**Issue templates** — issue **forms** (`.yml` with a `body:` of typed fields), not legacy `.md` templates:
- [ ] `.github/ISSUE_TEMPLATE/` with at least a bug report and a feature request; a refactor template for code-heavy projects
- [ ] Each form: `name`, `description`, `title` prefix (`'[Fix]: '`, `'[Feat]: '`), `labels`, and `required: true` on the fields that make an issue actionable (bug: description + steps to reproduce + expected + actual; feature: summary + motivation)
- [ ] `config.yml` present (decide `blank_issues_enabled` with the user; add `contact_links` for discussions/security if applicable)

**CONTRIBUTING.md** — must let a stranger go from clone to merged PR without asking anything:
- [ ] Setup and inner loop as copy-paste commands (install, build, test, lint)
- [ ] What pre-commit hooks/CI actually enforce vs. what the contributor must run themselves
- [ ] Commit convention (e.g. Conventional Commits) with concrete examples
- [ ] PR process: branch naming, review expectations, where to ask questions
- [ ] Project-specific gotchas (build-before-test, version pins that must move together, …)

**Everything else that matters:**
- [ ] `LICENSE` — without it the project isn't legally usable; ask the user which (MIT default suggestion)
- [ ] `.github/PULL_REQUEST_TEMPLATE.md` — short: summary, linked issue, checklist mirroring CONTRIBUTING requirements
- [ ] `CODE_OF_CONDUCT.md` — Contributor Covenant is the standard; needs a real contact address
- [ ] `SECURITY.md` — how to report vulnerabilities privately (GitHub private vulnerability reporting or an email)
- [ ] `.github/CODEOWNERS` — default `*` owner so PRs auto-request review (also required by the sibling skill **`dependabot-setup`**)
- [ ] Repo metadata via `gh repo view` — description and topics set; issues enabled

## Phase 2 — Report

Summarize as a table before touching anything:

| Item | Status | Finding |
|---|---|---|
| README | ✅ / ⚠️ needs work / ❌ missing | e.g. "no quickstart; assumes internal context" |
| Issue templates | … | e.g. "legacy .md templates; no required fields" |
| CONTRIBUTING.md | … | |
| LICENSE / CoC / SECURITY / PR template / CODEOWNERS | … | |

Propose a prioritized fix list and confirm scope with the user (AskUserQuestion) — especially: license choice, blank issues yes/no, CoC contact address, and who owns `CODEOWNERS`.

## Phase 3 — Create or update

Work through the confirmed list. Rules:

- **Update > replace.** For existing files, fix the specific gaps from Phase 1; keep the author's voice and any project-specific content.
- **Ground every claim.** Commands in README/CONTRIBUTING must be the repo's real scripts (read `package.json` scripts, `Makefile`, CI workflow) — run the quickstart yourself if possible; never invent commands.
- **Write for the target group.** README sells the project to a potential *user* first, contributor second. CONTRIBUTING is all mechanics. Don't duplicate content between them — link.

**Issue templates** — ready-to-use forms ship with this skill in its `reference/` folder (next to this SKILL.md):

- `reference/fix.yml` — bug report (label `bug`)
- `reference/feat.yml` — feature request (label `enhancement`)
- `reference/refactor.yml` — refactoring proposal (label `refactor`)

Copy them to `.github/ISSUE_TEMPLATE/`, replace the `<project>` placeholder with the repo name, and adjust fields only where the project genuinely differs. Add a `config.yml` per the Phase 1 checklist.

**Ensure the labels exist** — a form that references a missing label opens the issue silently unlabeled. Check and create what's missing:

```bash
gh label list --json name --jq '.[].name'
# default repos ship bug + enhancement, but usually not refactor:
gh label create refactor --description "Code refactoring or structural improvement" --color 6f42c1
```

## Phase 4 — Verify

- Issue forms: valid YAML and valid schema — GitHub silently falls back to a blank issue on schema errors, so check field types against the [syntax reference](https://docs.github.com/en/communities/using-templates-to-encourage-useful-issues-and-pull-requests/syntax-for-issue-forms)
- Every command written into README/CONTRIBUTING was executed or verified against the repo's actual scripts
- Re-run `gh api repos/{owner}/{repo}/community/profile` after pushing to confirm the health percentage improved
- Internal links resolve (CONTRIBUTING ↔ README ↔ LICENSE)

## Sources

- GitHub community profiles: https://docs.github.com/en/communities/setting-up-your-project-for-healthy-contributions/about-community-profiles-for-public-repositories
- Issue forms syntax: https://docs.github.com/en/communities/using-templates-to-encourage-useful-issues-and-pull-requests/syntax-for-issue-forms
- Contributor Covenant: https://www.contributor-covenant.org/
- Reference implementation: https://github.com/Miragon/wardley-maps-modeler
