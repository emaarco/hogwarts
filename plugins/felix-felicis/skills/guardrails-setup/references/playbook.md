# Guardrails playbook — tiers, phase details, thresholds, tools, pitfalls

Companion to `guardrails-setup/SKILL.md`. Based on the "Guardrails for AI-driven software development" methodology (inspired by Robert C. Martin's position that humans should manage AI-written code through measurements, not line-by-line review).

Each phase is one PR. After each phase the full verification run must be green.

---

## Right-sizing: assign a tier in Phase 0

The gate set must fit the repo — a maximal program in a small repo is over-engineering that gets routed around. Assign one tier in Phase 0, record the reasoning in the baseline report, and plan **only that tier's gates**. Everything above the tier is listed as "deliberately not recommended, and why". The tier is a default, not a cage — the user can pull individual higher-tier gates down if a specific risk warrants it. Borderline call between two tiers: pick the lower one (leanness wins; pulling gates down later is cheap, ripping them out is not).

| Tier | Typical repo | Gates |
|---|---|---|
| **T1 — Minimal** | Solo/2-person, greenfield or small tool, no external consumers | Phases 0–2 + a reduced 2b (ratchet file + guardrail paths). Anti-erosion checks that are cheap (`.only`, deleted tests). Stop here is a success. |
| **T2 — Team** | Team-maintained product, internal or few consumers, CI in place | T1 + full Phase 2b, error-path tests + branch coverage (5.2), anti-erosion gate (5.5), one real-dependency integration path per external system (5.3). |
| **T3 — Surface** | External consumers depend on the API/tooling (libraries, MCP/tool servers, public APIs) | T2 + contract snapshots (5.1), dead-code gate, fitness report (Phase 4 without mutation if CI budget is tight). |
| **T4 — Critical** | Core business systems, many contributors/agents, mature suites | T3 + mutation testing, property-based tests (5.7), rendering quota (5.6), flakiness gate (5.8), evals if an LLM is in the product (5.4). |

Per-gate trigger criteria that override the tier default:

- Mutation testing: only where a real test suite exists **and** the diff-scoped run fits the CI budget.
- Contract snapshots: only if something external actually consumes the surface.
- Evals: only if an LLM is a consumer or component of the product.
- Property-based tests: only for parser/migration/conversion/serialization-style code.

---

## Canonical artifacts

- **`docs/guardrails/baseline.md`** — required sections: date; tier + reasoning; rule classification table; per-package metrics table (with `unmeasured — tool absent` markers); test-type inventory; uncovered product promises; wall-clock baseline (build/test/lint) and verify-time budget; phased plan (per gate: tool, phase, runtime delta, accepted limitations); persona-challenge summary; per-phase decision log (accepted / deferred / rejected — rejected = consciously non-binding).
- **`guardrails/ratchets.json`** — every threshold (coverage, branch coverage, mutation break, complexity, file length), every debt list, the mutation exclusion list, coverage exclusions, skip/flaky allowlists — one file. Tool configs import from it where the tool allows; otherwise CI asserts tool config == state file. The Phase 2b gate diffs only this file (plus test deletions and guardrail paths) — it never parses tool configs.
- **`scripts/guardrails/`** — home of custom gate scripts (ratchet diff check, anti-erosion checks). Plain Node/`.mjs` (or the repo's scripting norm), no dependencies beyond a real glob library.

## Negative-test procedure (applies to every new gate)

1. On the phase branch, add a temporary commit that violates the rule.
2. Run verify; capture the failing output.
3. Revert the commit; paste the captured red output into the PR description.
4. For thresholds that start *below* baseline (nothing small can trip them): prove the mechanism by temporarily setting the threshold above the measured value, capture the red, restore — and note the substitution in the PR.
5. A gate whose negative test cannot be made red is not done and must not ship.

---

## Phase 0 — Inventory without code changes

Make visible which rules and gaps exist before changing anything.

1. **Evaluate architecture & convention documentation.** Extract all explicit rules from README, architecture docs, ADRs, CLAUDE.md, coding guidelines. Analyze the code itself: tech stack, frameworks, package structure, build/test system, deployment context, external interfaces, data storage, module boundaries, recurring patterns.
   - Greenfield / barely documented repo: derive rules from established architecture and quality patterns for the (planned) stack, not from prose.
2. **Classify every rule**: structurally checkable (dependency edge, layering) / pattern-checkable (forbidden API, naming) / metric-checkable (coverage, complexity) / human-judgment only.
3. **Measure the baseline** with existing tooling only (record with date): coverage + branch coverage per package, complexity, file lengths, mutation score, dead exports/dependencies, existing skips and `.only` risks, existing ignore/allowlists, **wall-clock of build/test/lint**. Where a tool is absent: `unmeasured — tool absent`; the introducing phase measures at installation time and sets its threshold then (e.g. mutation `break` at measured-baseline − 5 in Phase 4). Do not install tooling in Phase 0.
4. **Build a test inventory** by *type*: unit; integration against real dependencies; contract; rendering/UI; end-to-end; property-based; evals.
5. **Name uncovered product promises.** Answer explicitly: *Which promise of the product to its users is covered by no single test?*
6. **Assign the tier** (table above) and **draft the plan**: per rule and gap — gate, tool, phase, runtime delta, accepted limitations.

Result: `docs/guardrails/baseline.md`, committed as the Phase 0 PR after the persona challenge gate.

---

## Phase 1 — Architecture & pattern gates

Translate architecture rules from prose into machine-checkable rules: dependency linter, architecture tests, lint rules for forbidden APIs, pattern rules for allowed access points.

Requirements:

- Every structural architecture rule gets exactly one **named** rule.
- Error messages are phrased as instructions to the next agent. Bad: `forbidden dependency`. Good: "`domain` must not import `infrastructure`. Move the dependency behind a port interface in `domain/ports` and implement the adapter in `infrastructure`."
- **Existing-violation threshold rule:** ≤ 5 violations of a rule → fix behavior-neutrally in the same PR, no allowlist. More → freeze in the tool's *native* baseline mechanism (dependency-cruiser/ArchUnit/import-linter all have one), shrink-only, mirrored in `ratchets.json` so Phase 2b watches it.
- The gate hangs on the existing lint or verify command.
- **CI wiring happens here:** create/extend the workflow so `verify` (current subset) runs on PRs; later phases extend this same workflow. Making it a *required* check is delegated to `branch-ruleset-setup`.

---

## Phase 2 — Ratchet metrics

Thresholds are introduced so the build is green on day one but may only improve afterwards.

Typical ratchets: budgets for new code, debt lists for today's violations, coverage + branch-coverage thresholds per package, file-length and complexity budgets.

Starting defaults (confirm with the user — stack and domain matter):

- cyclomatic complexity: max 15
- file length: max 400 effective lines
- coverage per package: ~2 percentage points below baseline; packages near 0% get a floor of their current value and ratchet upward from the first real number (never "0 − 2")
- branch coverage: start below baseline, then raise-only

All values live in `guardrails/ratchets.json`. Existing violations are frozen there — rounded up to sensible steps, shrink-only.

Requirements: pure data files, generated catalogs, and fixtures are excluded **with a reason** (exclusion lists are shrink-only state-file entries); the ratchet convention is documented in docs *and* config; every gate passes the negative-test procedure.

---

## Phase 2b — The ratchet protects itself

Ratchets are just configuration, and the verify pipeline is just files. An agent can "fix" a red build by lowering a threshold — or by editing the gate itself. This dedicated diff gate (merge-base vs. HEAD) guards both. Prerequisite: Phase 2.

Red on:

- lowered threshold or grown debt/ignore/exclusion list in `guardrails/ratchets.json` (covers coverage, mutation, complexity, coverage-exclusions, mutation-exclusions, skip/flaky lists)
- shrunken tested surface (mutation scope, contract-snapshot coverage)
- workspace package missing from `ratchets.json` (a new package is not a free zone)
- new test skip without a machine-checkable reason (format: `skip: <ticket-ref> — <reason>`)
- removed test file without replacement (rename/move-aware via git similarity detection)
- **any diff touching guardrail paths** — kept **minimal** to avoid label fatigue: `guardrails/`, `scripts/guardrails/`, the verify command definitions, the workflow *job* that runs the gates, and the tools' **native baseline/known-violations files** (Phase 1 freezes; additionally CI asserts native file == `ratchets.json` mirror, drift = red — otherwise the native file is a free-growing escape valve). Not workflow files wholesale, not every lint config line, and never a whole-file match on `package.json`: verify script definitions are key-diffed (extract `scripts.verify*` from base and HEAD via `jq`, compare those values only) so routine dep bumps don't demand the label. The Phase 0 plan enumerates the exact path list and states how routine bot PRs flow (e.g. version-only `uses:` SHA bumps exempted by a narrow diff pattern; CODEOWNERS review still applies). An exception label that's needed weekly for routine bumps stops being a decision.

…unless the PR carries the **exception label**.

**Exception mechanism (exactly one):** a human applies a `guardrail-exception` PR label; the PR description must state the reason. The CI gate verifies the **labeling actor**, not just the label's presence — via the PR timeline (`gh api repos/{owner}/{repo}/issues/{n}/events`): actor ≠ PR author and not a bot/automation identity (or actor ∈ a maintainers team). Anyone with triage access can apply a label, so presence alone is agent-forgeable. The gating workflow must run on `pull_request` `types: [opened, synchronize, reopened, labeled, unlabeled]` — otherwise the check stays red after a human labels (and stays green after they unlabel) until the next push, and humans conclude the hatch is broken. Backed by CODEOWNERS + required review on guardrail paths and a branch ruleset requiring ≥ 1 human approval as backstop (delegate both to `branch-ruleset-setup`). Commit trailers or PR-body markers alone are unacceptable — the agent writes those itself. The 2b script's failure message should note the override lives in CI ("have a human apply the `guardrail-exception` label") so a locally-red `verify:full` on a legitimately-labeled branch doesn't send agents hunting for a local bypass.

**The skill's own phase PRs trip this gate — by design.** Phase 4/5 PRs edit `scripts/guardrails/`, workflows, and grow lists in `ratchets.json`; that red is the mechanism working. The human's label + review on these PRs *is* the approval; the skill notes the expected red and the label request in the PR body and treats "green after human label" as the passing state. Never special-case the skill's own changes inside the 2b script.

Good error message:

> Coverage threshold for `packages/api` was lowered from 84 to 79. Ratchets are raise-only. Write the missing test, or have a human apply the `guardrail-exception` label with a reason in the PR description.

Later phases **extend this red-list** as their config lands (Phase 4: mutation thresholds/exclusions; Phase 5: contract snapshots, flaky list).

---

## Phase 3 — Debt paydown (outside setup)

Shrinking the debt lists is ongoing team work — this skill only makes it measurable. **Never refactor user code as part of guardrail setup.** Run this phase only when the user explicitly asks for it.

When invoked: thematic, behavior-neutral steps (split large files, extract helpers, dispatch tables over long control flows, remove dead exports/dependencies). Every commit: all tests green, no snapshot/contract changes, coverage not decreased, and the concrete improvement named (e.g. "complexity debt 28 → 21 entries", "`InvoiceMapper`: complexity 59 → 12"). For code with observable output, diff a golden run (build artifact, CLI output) before/after.

---

## Phase 4 — Mutation testing, dead code, fitness report

Check whether the tests actually kill real faults — not just execute code.

### Mutation testing

Introduce per package — only where a real test suite already exists and the diff-scoped run fits the CI budget. Measure the baseline at installation time (full run once); `thresholds.break` starts ~5 points below it.

**Scope model — exclusion, not allowlist:** all source files in covered packages are in scope by default; a shrink-only exclusion list in `ratchets.json` carries per-entry reasons. (A grow-only allowlist prevents shrinking but not stagnation — new code simply never gets added.) The PR gate mutates only changed files in scope, compared against `git merge-base` with the target branch, with a fresh throwaway cache. If a file limit kicks in, skip **loudly** — never silently.

### Dead-code gate

The architecture linter prevents wrong edges; the dead-code gate prevents dead nodes. Ignore entries carry a reason and are shrink-only (state file). Noisy dimensions may start report-only, with a documented path to enforcement.

### Fitness report

One command (e.g. `<pm> fitness`) aggregates existing artifacts — it never re-measures. Contents: architecture rules and violations; ratchet debt level; coverage + branch coverage per package; mutation score per package; dead-code findings; **gates that did not run, with reasons and their class**:

- **required** gate (coverage, ratchet diff, architecture, anti-erosion; dead-code and contract snapshots once out of their introduction period): missing artifact ⇒ build red
- **report-only** gate (evals, mutation while being introduced): missing artifact ⇒ visibly reported as "no run"
- a gate without a stated class defaults to **required**

CI: upload results as artifacts, consume them in a dedicated report job, surface the report in the CI summary.

---

## Phase 5 — Test architecture for AI agents

The previous phases protect the *form* of the code. This phase protects the *behavior* of the product — what an agent can break without any structural metric turning red.

### 5.1 Golden contract of the external surface

Freeze what consumers actually depend on — not just names: descriptions, input schemas, required fields, enum values, annotations, output shape, error formats. For MCP/tool servers, the tool description itself is API — an agent that "improves" it changes the behavior of every model that reads it. The contract is a checked-in snapshot; its coverage is measured (count of snapshotted endpoints/tools/schema keys, recorded in `ratchets.json`, grow-only). **Modified or removed snapshot entries require the `guardrail-exception` label** — that's where the "agent improves the tool description" risk lives, and a self-written justification next to a `-u` run is no gate. Pure additions (new endpoint/tool) pass without a label: they can't break existing consumers, stay visible in the diff, and grow the coverage count.

### 5.2 Error-path tests & branch coverage

Agents reliably build the happy path if tests only demand the happy path. Every package needs relevant error-path tests: 4xx/5xx from the other side, timeouts, empty responses, malformed shapes, missing configuration, permission errors, invalid user input. Branch coverage is measured per package and ratcheted.

### 5.3 Integration tests against real dependencies

Fixture-only tests are risky with AI: when code and fixture disagree, an agent often adapts the fixture to the code — not the code to reality. At least one relevant path per external system runs against a real dependency: Testcontainers, Docker Compose, local emulators, or real sandbox systems.

### 5.4 Evals for LLM-based systems

If an LLM is a consumer or component of the product: realistic user requests with expected results (expected tool call, arguments, clarifying question, refusal, answer structure). Start report-only (cost and nondeterminism are real) with a **stated promotion criterion** to blocking (e.g. "N runs with variance < X"); success rate appears in the fitness report. Never ratchet a nondeterministic rate without a run-count/variance floor.

### 5.5 Anti-erosion gate

Protects the test suite itself. Red on: `.only` in the diff; new `skip` without a reason matching the required format; deleted test files without replacement; snapshot updates outside 5.1's label path; new `todo` in tests without ticket. Existing conditional skips live as a reasoned allowlist in the state file. Known limits — weakened matchers (`toEqual` → `toBeDefined`), early returns inside test bodies, constant-vs-constant assertions — are hard to detect statically: cover what a lint rule can, and **name the rest in the fitness report as an accepted, unmeasured erosion vector** (diff-scoped mutation is the real backstop: it catches tests that no longer kill faults in changed code).

### 5.6 Rendering / UI tests

Define which share of UI components must have at least one render test. If the mutation runner excludes UI suites, the fitness report shows that surface as unmeasured — otherwise the score looks repo-wide while a relevant part is missing.

### 5.7 Property-based tests

Most valuable where edge cases are hard to enumerate: parsers, migrations, conversions, normalizations, serialization/deserialization, mapping between external and internal formats.

### 5.8 Flakiness gate

A flaky test is an invitation for an agent to weaken the assertion or disable the test. Options: run new tests multiple times; nightly full-suite reruns; quarantine only with a reason; flaky list shrink-only (state file); no silent retries without a report.

### 5.9 Tiered verification commands

Two commands, both defined identically for local and CI use:

- **`<pm> verify`** — fast loop, run constantly: format → lint → architecture gates → pattern gates → typecheck → unit tests. Budget: ≤ 2 min local (or the budget from the baseline report).
- **`<pm> verify:full`** — canonical, CI-required: verify + integration tests → coverage/branch coverage → ratchet diff check → mutation gate → dead-code gate → contract snapshots → anti-erosion gate → fitness report.

A single 14-step command that takes double-digit minutes stops being run — and a verify command nobody runs is decoration (principle 1). On failure every gate explains what to do.

---

## Tool map

| Purpose | TypeScript / JavaScript | Java / Kotlin | Python | Go |
| --- | --- | --- | --- | --- |
| Architecture gate | dependency-cruiser | ArchUnit, Konsist | import-linter | go-arch-lint |
| Pattern gates | ESLint (`no-restricted-syntax`, `no-restricted-imports`, `no-restricted-globals`) | Checkstyle, Error Prone, Detekt | ruff | golangci-lint |
| Complexity | ESLint `complexity`, plato | Detekt, Checkstyle | radon, ruff | golangci-lint |
| File length | ESLint / custom rule | Checkstyle, Detekt | ruff / custom | golangci-lint |
| Coverage | vitest + v8, jest | JaCoCo | coverage.py | `go test -cover` |
| Mutation testing | StrykerJS | PIT | mutmut, cosmic-ray | go-mutesting (unmaintained — verify alternatives first) |
| Dead code | knip | unused-deps plugins | vulture, deptry | staticcheck |
| Integration | Testcontainers, Docker Compose | Testcontainers | Testcontainers | testcontainers-go |
| Contract snapshots | vitest/jest snapshots, schemathesis | JUnit snapshots, Spring Cloud Contract | pytest snapshots, schemathesis | golden files |
| Property-based tests | fast-check | jqwik, Kotest | hypothesis | rapid |
| Evals | own eval suite, Anthropic/OpenAI SDKs | own eval suite | own eval suite | own eval suite |

For stacks not in the table — and before recommending anything version-sensitive — research current equivalents via primary docs.

---

## Known pitfalls

Collected from real introductions (mostly TS/StrykerJS/knip stacks — transfer the *rule*, not the tool specifics):

1. **Hand-rolled glob semantics.** A homemade glob-to-regexp converter can misinterpret `**`; nested files silently fall out of the gate. Rule: use the same glob library the tool itself uses.
2. **Incremental cache corrupts diff scores.** Mutation caches can mix other files' results into the score — green locally, red on fresh CI checkout. Rule: run diff-mutation gates against a fresh throwaway cache.
3. **Report job without data.** If tests and mutation run in different jobs but the report only sees one, the mutation column stays structurally empty. Rule: upload reports as artifacts; consume them in a dedicated report job.
4. **Optional artifacts.** If an empty diff produces no mutation artifact, the download in the report job must not fail. Rule: allow optional downloads and visibly show "no run" in the report.
5. **`always()` also runs after cancel.** For "run even if a predecessor failed", `!cancelled()` is usually what's meant.
6. **Tool artifacts in the commit.** Mutation runners create sandbox/setup/cache files. Rule: update `.gitignore` before the first commit.
7. **Exclusion list as escape valve.** When a file fails mutation testing it's tempting to exclude it. Rule: adding an exclusion is a red-list event (Phase 2b) — it needs the exception label, or the remaining scope's threshold rises accordingly.
8. **Coverage as false safety.** High line coverage can still mean no relevant product promise is tested. Rule: always combine coverage with test types, branch coverage, and explicit product promises.

---

## Definition of Done

Applies to **accepted phases only** — deferred or rejected gates are instead listed in the baseline report as consciously non-binding, with reasons. A guardrail introduction is finished when:

- the full verification run of every accepted phase is green
- build, typecheck, test, lint, and format behave identically locally and in CI (`verify:full` definition shared)
- every new gate passed the negative-test procedure, and the red output is in its PR
- baseline numbers are documented with a date in `docs/guardrails/baseline.md`
- all ratchet state lives in `guardrails/ratchets.json`, and the Phase 2b gate (if accepted) watches it plus the guardrail paths
- thresholds raise-only, debt/ignore/exclusion lists shrink-only, tested surfaces grow-only
- exactly one exception path exists: human-applied label, CI-checked, review-backed
- every test type from the inventory is covered, or excluded with a reason
- the fitness report (if in tier) appears in the CI summary and names every unmeasured surface
- the repository documents `verify` and `verify:full`, and CI requires `verify:full`
