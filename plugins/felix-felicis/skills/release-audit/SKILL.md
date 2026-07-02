---
name: release-audit
description: "Release & supply-chain readiness audit: gathers evidence from real workflows, manifests, and repo settings, compares against a gold-standard reference stack, has an adversarial subagent try to refute the draft, and returns a prioritized action plan (P1–P3) whose fixes are delegated to the sibling setup skills. Use when asked to audit release automation, publishing security, CI or supply-chain maturity, or whether a repo is ready to release. For a whole-repo health check (docs, tests, code quality) use maturity-analysis instead."
allowed-tools: Agent, Bash, Read, Grep, Glob, WebFetch, WebSearch, AskUserQuestion
metadata:
  status: beta
---

# Skill: release-audit

Audits how a repository releases software — versioning, secure publishing, CI, PR validation, supply-chain hardening — and returns a reviewed, prioritized action plan. It orchestrates: findings are graded against a gold standard, an adversarial subagent tries to tear the draft apart, and every accepted fix points at the sibling skill that implements it.

## Inputs

Ask (AskUserQuestion) only for what wasn't given:

- **DEPTH** — `quick` (top ~8 highest-impact findings, light research) | `standard` (default: full checklist + stack research) | `deep` (also verify live repo settings via `gh api`)
- **FOCUS** (optional) — e.g. "publishing security only"
- **CONSTRAINTS** (optional) — e.g. "no paid GitHub plan", "must stay on PATs for now", "private repo"

## Operating rules

- **Evidence first.** Read the real files and command output you reason from. Never claim anything about a file or setting you have not inspected. What you can't verify (e.g. repo settings without API access) is marked "unverified" — never guessed.
- **Cite everything**: `path:line`, a config key, or the exact command and its output (e.g. `gh api repos/{owner}/{repo}/rulesets`).
- **Right-size to THIS repo.** A solo public library, a private app, and a multi-package monorepo need different answers. Recommend the simplest thing that meets the goal.
- **Prefer primary sources** (official tool/registry/platform docs) over blog posts; date version- or GA-sensitive claims.

## Phase 0 — Detect

Short factual summary: ecosystem(s), package manager(s), topology (single vs. monorepo), visibility (public/private), host, current release mechanism (if any). State the DEPTH and any FOCUS/CONSTRAINTS being honored.

## Phase 1 — Gather evidence

Read the real artifacts: CI/release workflows, reusable/composite actions, package manifests + lockfile, version/changelog config, dependency-bot config, commit/PR conventions, security workflows. At `deep`, also inspect live settings: `gh api repos/{owner}/{repo}/rulesets`, environments, Actions permissions, secret *names* only. Record each observation with its evidence pointer. Do **not** propose fixes yet.

## Phase 2 — Research & draft

Read `references/reference-standard.md` (next to this SKILL.md) — the gold-standard stack and the review rubric. For non-JS stacks, map each control to the ecosystem equivalent (research via primary docs: release-please vs. changesets vs. semantic-release, PyPI/crates/Maven trusted publishing, etc.).

Draft the action plan in the Output format below, tying each finding to Phase-1 evidence and a best-practice source.

## Phase 3 — Adversarial review gate

Launch a **fresh subagent** that gets ONLY: (a) the draft, (b) the rubric section of `references/reference-standard.md`, (c) read access to the repo. Instruct it to act as a skeptical staff platform/security engineer who did not write the draft and to try to **refute** it: unfounded claims, wrong tool for the stack, recommendations that don't fit the repo's topology or maturity, security gaps, over-engineering. It must return: pass/fail per rubric criterion with a one-line justification, required fixes (correctness/security/requirement gaps only), a separate "optional" list, and an overall 1–5 confidence score.

The reviewer flags ONLY gaps that affect correctness, security, or a stated requirement — nice-to-haves go on the optional list. A reviewer that manufactures problems creates over-engineering.

Apply every **required** fix to the draft. Note accepted/rejected review findings in one short paragraph of the final report.

## Phase 4 — Final report

### Output format

1. **Executive summary** — 3–6 sentences: current maturity, the 2–3 biggest risks, the headline moves.
2. **Maturity snapshot** — table: Versioning · Secure publishing · CI · PR validation · Supply-chain hardening, each `Present / Partial / Missing / N/A` with a one-line evidence note.
3. **Prioritized action plan** — per finding: **Title** `[P1|P2|P3]`, **Evidence** (`path:line` / setting / command output), **Why it matters**, **Recommendation** (concrete fix or the sibling skill to run — see table below), **Effort** (S/M/L + prerequisites), **Source** (primary doc URL). P1 = security/correctness, P2 = clear improvement, P3 = polish.
4. **Sequencing** — "do this first → then → later" quick-win path.
5. **Out of scope / deliberately not recommended** — controls considered and rejected, with reasons (scale, visibility, constraints). Required section: it shows what was weighed.
6. **Open questions / unverified.**

### Fix delegation

Point each finding at the sibling skill that implements it instead of re-explaining the fix:

| Finding area | Sibling skill |
|---|---|
| Versioning / changelog / release automation | `release-please-setup` |
| Long-lived registry tokens, missing provenance | `secure-publish-setup` |
| Unpinned GitHub Actions | `pin-github-actions` |
| Floating npm versions / missing lockfile | `pin-node-dependencies` |
| Missing/weak Dependabot config | `dependabot-setup` |
| No branch protection / rulesets | `branch-ruleset-setup` |
| Missing CODEOWNERS / community files | `contributor-setup` |

Keep prose tight — tables and snippets over paragraphs.
