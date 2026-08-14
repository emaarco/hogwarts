---
name: guardrails-setup
description: "Introduces and maintains machine-checkable guardrails (fitness functions) so AI agents can work safely in a repo: architecture & pattern gates, ratchet metrics (raise-only coverage/mutation, shrink-only debt lists), a self-protecting ratchet diff gate, behavior gates (contract snapshots, error paths, anti-erosion), and a single verify command — right-sized to the repo, phased, one PR per phase, every gate negative-tested. Use when asked to set up guardrails or fitness functions, make a repo safe for AI agents, stop quality erosion, protect coverage thresholds, or audit existing guardrails. For release automation, publishing, or supply-chain audits use release-audit; for a whole-repo health check use maturity-analysis."
allowed-tools: Agent, Bash, Read, Grep, Glob, Write, Edit, WebFetch, WebSearch, AskUserQuestion
---

# Skill: guardrails-setup

## Why this skill exists

Robert C. Martin ("Uncle Bob", author of *Clean Code*) describes a radical shift for AI-driven development:

> "I don't review code written by agents. I measure things like test coverage, dependency structure, [and more]. The code itself I leave to the AI. Humans are slow at code. To get productivity we humans need to disengage from code and manage from a higher level."
> — Robert C. Martin, post on X

The conclusion is **not** "code reviews are obsolete." The conclusion is: **when AI agents write code, architecture, quality, and behavior rules must be machine-checkable.** Human-attention review does not scale with the speed of AI-generated code, and for an agent any rule that lives only in a README or team knowledge is effectively optional — an agent under pressure to turn a red build green reliably takes the nearest path, including lowering a threshold or skipping a test.

Therefore: **every important architecture or quality rule needs either an automated gate — or the honest admission that it is not binding.** The goal is not a metrics dashboard; it is a build that reliably turns red when an agent violates a relevant rule.

## Core principles

1. **A gate that never fired is decoration.** Every new gate is deliberately violated once to prove it turns red (negative-test procedure in the playbook). A gate whose negative test cannot be made red must not ship.
2. **Comments are not guardrails.** Prose rules only count once they become concrete checks.
3. **No silent skipping.** If a gate doesn't run (empty diff, missing artifact, file limit, missing config), that must be loudly visible — and for required gates, red.
4. **Ratchets protect direction.** Thresholds start below the measured baseline, then: coverage & mutation score raise-only, debt/ignore/exclusion lists shrink-only, tested surfaces grow-only.
5. **Gates guard the gates.** An agent's cheapest bypass is rarely the threshold — it's the gate's own config, the verify script, or the workflow file. Changes to guardrail paths are themselves gated (Phase 2b).
6. **Metrics don't replace behavior tests.** Coverage, complexity, and mutation score measure the *form* of code — not whether the product keeps its promises.
7. **Exactly one escape hatch, outside the agent's reach.** Exceptions go through a human-applied PR label whose **labeling actor** CI verifies (≠ PR author, not a bot), backed by required review on guardrail files. Commit trailers or PR-body markers are not acceptable — the agent that lowered the threshold writes those itself. A gate without an official way out gets bypassed.

## Inputs

Ask (AskUserQuestion) only for what wasn't given:

- **MODE** — `audit` (assess existing guardrails against the repo's tier, report gaps, no changes) | `setup` (default: Phase 0 baseline → challenged plan → per-phase approval → implement) | `phase <n>` (implement one phase from an existing committed plan at `docs/guardrails/baseline.md`; personas are not re-run — the plan was already challenged)
- **SCOPE** (optional) — e.g. "packages/api only", "skip mutation testing"
- **CONSTRAINTS** (optional) — e.g. "CI minutes are tight", "no new dev dependencies", "team of 2"

## Operating rules

- **Evidence first.** Read the real configs, workflows, and command output you reason from. Baselines come from running the tools where they exist; where a tool is absent, record **"unmeasured — tool absent"** and measure at tool-installation time in the phase that introduces it. Never estimate, never install throwaway tooling in Phase 0.
- **Right-size before you plan.** Phase 0 assigns the repo a tier (playbook: "Right-sizing"); the plan proposes only that tier's gates and lists everything deliberately left out, with reasons. Stopping after Phase 2 is a legitimate end state. Audit mode reports gaps only against the repo's tier, with higher-tier gates under "not recommended for this repo, and why".
- **Green on day one.** Thresholds start below the measured baseline; pre-existing violations are frozen shrink-only (Phase 1 threshold rule: ≤ 5 violations of a rule → fix behavior-neutrally in the same PR, no allowlist; more → freeze in the tool's native baseline). The build never turns red retroactively.
- **Cost is part of the plan.** Phase 0 records the current wall-clock of build/test/lint; every proposed gate carries an estimated runtime delta and the plan declares a verify-time budget (default: fast `verify` ≤ 2 min local, full CI ≤ 15 min). Gates that bust the budget are diff-scoped, moved to nightly, or dropped.
- **One phase per PR.** The skill branches, implements, and opens the PR itself (`gh pr create`), with the negative-test proof in the PR body; it waits for merge (or explicit user instruction) before the next phase. After each phase the full verification run is green.
- **Error messages are instructions to the next agent.** Not "forbidden dependency" but: "`domain` must not import `infrastructure`. Move the dependency behind a port interface in `domain/ports` and implement the adapter in `infrastructure`."
- **Reuse before build.** Prefer established tools (playbook tool map) over custom scripts. Custom scripts only for gates no tool covers (ratchet diff check, anti-erosion checks), under `scripts/guardrails/`, following the playbook's pitfall rules (real glob library, fresh caches, optional artifacts).
- **Audit mode never writes.**

## Canonical artifacts

Two committed files make runs reproducible and later invocations possible:

- **`docs/guardrails/baseline.md`** — the Phase 0 report: date, tier + reasoning, rule classification, per-package metrics (with "unmeasured" markers), test-type inventory, uncovered product promises, wall-clock baseline, the phased plan with per-gate runtime deltas, and the persona-challenge summary. Committed as the Phase 0 PR. `phase <n>` mode reads it; deviations from the plan require user confirmation.
- **`guardrails/ratchets.json`** — single machine-readable source of truth for every threshold, debt list, allowlist/exclusion list, and skip/flaky list. Tool configs read from it (or CI asserts config equals state file). The Phase 2b gate diffs **this file** against the merge-base — never parses tool configs.

## Phases

Full details, tiers, thresholds, tool map, negative-test procedure, pitfalls, and Definition of Done live in `references/playbook.md` (next to this SKILL.md). Summary:

- **Phase 0 — Inventory, no code changes.** Extract explicit rules (README, ADRs, CLAUDE.md, guidelines) and implicit ones from the code; classify each by checkability (structural / pattern / metric / human-only); measure what's measurable; inventory test *types*; name product promises no test covers; assign the tier; draft the plan → `docs/guardrails/baseline.md`.
- **Phase 1 — Architecture & pattern gates.** Dependency rules and forbidden APIs as named lint/arch rules with instructive messages, attached to the verify command — which is wired into CI **in this phase** (later phases extend the same workflow).
- **Phase 2 — Ratchet metrics.** Budgets for new code; existing violations frozen shrink-only in `ratchets.json`; per-package coverage thresholds just below baseline.
- **Phase 2b — The ratchet protects itself.** A diff gate (merge-base vs. HEAD) over `ratchets.json`, test-file deletions, and a **minimal list of guardrail paths** (the state file, `scripts/guardrails/`, the verify command definitions, the gate-running workflow job — enumerated in the Phase 0 plan together with how routine bot PRs flow): red on lowered thresholds, grown debt/ignore/exclusion lists, shrunken tested surfaces, unexplained skips, unlisted new packages, or guardrail-path edits — unless the human-applied exception label is present. Later phases extend this gate's red-list as their config lands.
- **Phase 3 — Debt paydown (separate, user-invoked).** Not part of setup: shrinking debt lists is ongoing team work that this skill only makes measurable. Never refactor user code during guardrail setup.
- **Phase 4 — Mutation testing, dead code, fitness report.** Diff-scoped mutation over a shrink-only *exclusion* model (all source in covered packages is in scope unless excluded with a reason); dead-code gate; one `fitness` command aggregating existing artifacts (never re-measuring), explicitly listing gates that did NOT run and whether each is required (missing = red) or report-only.
- **Phase 5 — Test architecture for AI agents.** Golden contract snapshots of the external surface (for MCP/tool servers the tool descriptions are API; modifying or removing snapshot entries needs the exception label — pure additions pass); error-path tests + ratcheted branch coverage; ≥ 1 real-dependency integration path per external system; evals when an LLM is part of the product (report-only with a stated promotion criterion); anti-erosion gate for the test suite; rendering/UI and property-based tests where the tier warrants; flakiness quarantine (shrink-only); tiered verification: fast `verify` for constant local use, `verify:full` as the canonical CI-required run — identical in definition locally and in CI.

## Persona challenge gate (setup mode only)

The Phase 0 plan is a hypothesis. Before presenting it to the user, challenge it with **three parallel fresh subagents**, each getting ONLY the draft baseline report + read access to the repo:

1. **The skeptical staff engineer** — hunts over-engineering: gates that cost more than they protect, wrong tier, tooling that doesn't fit the stack. Motto: "every gate is a tax on every future change."
2. **The AI agent under pressure** — for each proposed gate, names the cheapest bypass (lower the threshold, widen an exclusion, weaken an assertion, edit the gate itself) and checks whether another gate catches it. Confirmed bypasses become Phase 2b red-list entries, not prose.
3. **The maintainer six months later** — operability: escape hatch documented and human-gated, **no label fatigue** (how often would routine work need the exception label in this repo?), skips loud, debt lists able to actually shrink, fitness report honest about what is NOT measured.

Rules for the gate: **an empty required-changes list is a valid and expected outcome — do not invent findings.** Every required change must cite concrete repo evidence (file, config key, command output) or it is downgraded to optional. Each persona returns required changes, an optional list, and a 1–5 confidence score. **Apply required changes in every case**; scores ≥ 4 across all personas skip only the re-run. Otherwise re-run only the objecting personas **once** on the revised plan; if a disagreement survives, present it to the user via AskUserQuestion. Tie-break: on whether a gate should exist at all, leanness (persona 1) wins; on how an existing gate is protected, bypass-resistance (persona 2) wins. Summarize accepted/rejected challenges in the baseline report.

Then present the plan **per phase** via AskUserQuestion (accept / defer / reject). Rejected gates are recorded in the baseline report as consciously non-binding rules — the honest admission the principles demand. The Definition of Done applies to accepted phases only.

## Fix delegation

Adjacent concerns are owned by sibling skills — point at them instead of re-implementing:

| Concern | Sibling skill |
|---|---|
| Required checks, CODEOWNERS-backed review on guardrail paths, no force-push | `branch-ruleset-setup` (enforces the Phase 2b exception mechanism) |
| Unpinned GitHub Actions | `pin-github-actions` |
| Floating npm versions / missing lockfile | `pin-node-dependencies` |
| Release automation & versioning | `release-please-setup` |
| Publishing security / provenance | `secure-publish-setup` |
| Release & supply-chain audit | `release-audit` |
| Whole-repo maturity check | `maturity-analysis` |

## Output

- **`audit`** — a gap report: the repo's tier with reasoning, existing gates (with evidence), bypassable gates (which principle they violate and the cheapest bypass), missing gates *for this tier*, higher-tier gates under "not recommended, and why", prioritized next steps. No changes.
- **`setup`** — the committed baseline report, the persona-challenged per-phase-approved plan, then per accepted phase: a PR with the implementation, the negative-test proof for each new gate, and a green verification run.
- **`phase <n>`** — one PR implementing that phase from the committed plan: implementation, negative-test proof per new gate, green verification run, and the baseline report's plan section updated (phase marked done).

Keep prose tight — tables and measured numbers over paragraphs.
