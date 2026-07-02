# Reference standard & review rubric

## Gold standard: Miragon/wardley-maps-modeler

The house reference for "what good looks like" is [Miragon/wardley-maps-modeler](https://github.com/Miragon/wardley-maps-modeler) — an npm-workspaces TS monorepo publishing to npm + the VS Code Marketplace. Treat it as the *shape* of a mature setup, not a literal checklist; map each control to the target repo's ecosystem equivalent.

### Release & versioning

- **release-please** (`googleapis/release-please-action`) with a manifest + config file, driven by Conventional Commits; merging the bot's Release PR is what cuts a release.
- Monorepo on a shared version line: single root package + `extra-files` JSON bumps for every workspace version and cross-workspace dependency pin (`release-type: node`, `include-component-in-tag: false`). Independent versions would instead use the `node-workspace` + `linked-versions` plugins.

### Secure publishing (no long-lived tokens)

- Publishing runs in a reusable workflow (`workflow_call`) with OIDC trusted publishing: `id-token: write`, `npm publish --provenance`, **no NPM_TOKEN secret**. The publish step is idempotent (skips if the version is already on the registry).
- A **GitHub App token** (`actions/create-github-app-token`) — NOT the default `GITHUB_TOKEN` — authenticates the release-please step, because PRs/commits made with `GITHUB_TOKEN` do not trigger further CI runs (the single most-overlooked release-automation gotcha).
- Deploy targets are gated behind GitHub Environments (`environment: npm`, `environment: vscode-marketplace`). The one unavoidable long-lived secret (VS Code Marketplace PAT) lives in its protected environment.

### CI & PR validation

- CI workflow: lint, test, browser/e2e tests in a pinned container, dependency-graph check, build, format check, dependency-pinning check, dependency-review — with least-privilege `permissions: contents: read`, `concurrency` cancel-in-progress, `merge_group` support, and a composite setup action.
- PR titles validated as Conventional Commits (`amannn/action-semantic-pull-request`) — the correct choice for a squash-merge repo.

### Supply chain & hardening

- CodeQL (on PR + weekly schedule), `dependency-review-action` on PRs, Dependabot (grouped, weekly npm / monthly actions, cooldown, reviewers via CODEOWNERS).
- Exact dependency-version pinning enforced in CI (no `^`/`~`/`>=`); every action `uses:` pinned to a full commit SHA.
- Branch ruleset on the default branch: required status checks, required signed commits, linear history, no force-push / deletion, no bypass actors.

## Review rubric (Phase 3)

The adversarial reviewer grades the draft against each criterion — pass/fail with a one-line justification — and gives an overall 1–5 confidence score. Every **fail** must be fixed before the final report.

1. **Evidence-grounded** — every finding cites a real file/setting/command output; zero claims about un-inspected files; no hallucinated config.
2. **Stack-correct** — recommended tools/controls actually fit the detected ecosystem(s) and topology (single vs. monorepo, public vs. private).
3. **Coverage** — addresses each reference-standard area relevant to this repo (versioning, secure publishing, CI, PR validation, supply-chain hardening) or explicitly says why an area is N/A.
4. **Security substance** — checks long-lived publish tokens, the GITHUB_TOKEN-doesn't-retrigger-CI gotcha, token/permission scope, action pinning, branch protection — not just cosmetic CI tweaks.
5. **Right-sized** — no controls disproportionate to the repo's scale/visibility; stated CONSTRAINTS respected; over-engineering in the draft is itself a finding.
6. **Actionable & prioritized** — each finding has a concrete fix (or sibling-skill delegation), impact, effort estimate, and sensible priority; high-impact items genuinely first.
7. **Current** — best-practice claims reflect present-day tooling, cite a primary source, and date version/GA-sensitive facts (e.g. npm trusted publishing GA 2025-07-31).
