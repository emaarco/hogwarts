---
name: dependency-update-shepherd
allowed-tools: Bash, Read, Grep, Glob, Edit, Write, AskUserQuestion
description: "Shepherds open dependency-update branches/MRs (Renovate, Dependabot, manual) to a mergeable state: finds the first causal CI failure, reproduces and fixes it locally, verifies, pushes, watches the new pipeline, and only then — with explicit opt-in, never for majors — merges or arms auto-merge. Use when dependency-update PRs/MRs are red, stuck, or piling up, or when asked to fix / rebase / merge dependency updates."
---

# Skill: dependency-update-shepherd

Take one open dependency-update branch at a time from red/stale to merged — evidence-based, bot-aware, with hard stop rules. Repo config, CI logs, and MR state are authoritative; never guess.

## IMPORTANT — safety rules (apply throughout)

- GitHub → `gh`, GitLab → `glab`; never call forge APIs directly except where a CLI gap is noted below. Missing CLI → stop, ask the user to install it.
- **Never commit to or push the target branch** (`main`/`master`/…). Work only on the dependency-update branch.
- Rewritten history is pushed only with `git push --force-with-lease=<branch>:<sha-your-work-is-based-on>` — never `--force` — and re-check the remote head right before pushing: the bot may have pushed meanwhile.
- **Never hide a failure**: no disabling/skipping tests, linting, or checks; no loosening version pins to make CI pass.
- **Iteration cap:** each push (or CI-verified hypothesis) that ends in a red pipeline consumes 1 of 3 iterations; after the 3rd red, stop and report. Rebase pushes and job reruns don't count but are logged.
- **One flaky rerun per MR, total.** A test failure that turns green on rerun is still reported as "flaky, unverified" — never silently treated as a pass.
- Conflict resolution is a semantic decision, not a textual one. Unclear → stop and ask.
- Any MR-visible write (comment, description edit) and auto-merge require the Phase-0 opt-in; agent-authored code fixes additionally require the fresh per-MR diff confirmation in the merge gate.

## Phase 0 — Scope & policy

1. Detect forge (`git remote -v`), target branch (`gh repo view --json defaultBranchRef` / `glab repo view`), and update bot: `renovate.json*`/`.renovaterc*` → Renovate, `.github/dependabot.yml` → Dependabot, else manual branches.
2. List open candidate PRs/MRs (`gh pr list --json number,title,author,headRefName,mergeable,statusCheckRollup` / `glab mr list`) and **authenticate** them: the author must be the verified bot identity (`app/dependabot`, `renovate[bot]`, or the bot account the repo's config names). Anything else — including every "manual" branch — needs explicit per-MR user confirmation; a branch merely *named* `renovate/…` is not trusted. Confirm the diff touches manifests/lockfiles.
3. Classify semver impact per bumped package from the diff. **Major-equivalent** (never auto-merged unless the user names it explicitly): any major bump, any `0.x` minor bump, any grouped MR containing one, and any un-classifiable ref (git SHA, Docker tag/digest, Action pin).
4. Ask via AskUserQuestion, once: which MR(s) to process (single / all one-by-one, major-equivalents last), whether the skill may write to MRs (comments, description edits), and whether it may merge / arm auto-merge at the end (default: no — leave the MR ready and report).
5. Read the repo's rules once: CONTRIBUTING, CI workflows + required checks, protection/approval policy, merge method, and the local verify commands (`package.json` scripts, `Makefile`, CI steps). These define what "green" and "verified" mean below.

## Phase 1 — Freshness first (bot-aware)

Errors on a stale base are noise — make the branch current before touching any failure.

1. `git fetch origin`; behind or conflicting? `git rev-list --count <branch>..origin/<target>` + the forge's mergeable state.
2. If stale **and no foreign commits have been pushed yet**, prefer the bot's own rebase — it keeps the bot maintaining the branch:
   - Dependabot: `gh pr comment <n> --body "@dependabot rebase"`.
   - Renovate: fetch the MR body, flip `- [ ]` → `- [x]` on the rebase/retry checkbox line **only**, write it back (`gh pr edit <n> --body-file` / `glab mr update <iid> --description`).
   - Poll `gh pr view <n> --json headRefOid` (GitLab: `glab mr view <iid>` sha) every ~30 s, max ~10 min — self-hosted Renovate may only act on its next scheduled run. No new push → take over manually.
3. **Once you have pushed anything to the branch, bot rebase is permanently forbidden for this MR** — both bots force-push and would wipe your commits; rebase manually from then on. A takeover also ends bot maintenance (Dependabot stops updating the branch, Renovate marks it edited) — record this in the report.
4. Manual-rebase conflict rules:
   - **Lockfile**: never hand-edit. Take the target branch's lockfile, re-apply only the intended bump with the ecosystem's conservative command (e.g. `npm install --package-lock-only <pkg>@<version>`), then diff against the bot's original lockfile: any changed package, version, `resolved` URL, or `integrity` hash beyond the declared bump(s) → stop and report (supply-chain risk).
   - **Manifest**: if the target branch already bumped the same package (grouped/security-update race), keep the higher intended version — or abort and let the bot recreate the MR. Otherwise keep the bump, take everything else from the target.
   - **Business logic**: stop, ask.
5. After a manual rebase: verify and push per Phase 4, then continue at Phase 2.

## Phase 2 — Identify the first causal failure

1. Fetch the pipeline for the branch's **latest** commit: `gh pr checks <n>`, `gh run view <id> --log-failed`; GitLab: `glab ci get --merge-request=<iid>` — plain branch-pipeline commands miss detached MR pipelines. Ignore stale runs. **All green → jump to the merge gate.**
2. Find the **first causal** failure, not downstream noise (a failed build fails every later job).
3. Read the full failed-job log; extract the exact command, parameters, and environment (versions, OS, env vars) from the workflow definition.
4. Classify: code incompatibility with the new version · test failure · lint/type failure · infrastructure/runner problem · missing secret/permission · transient. GitHub quirk: Dependabot-triggered runs get a read-only `GITHUB_TOKEN` and the separate *Dependabot secrets* store — a takeover push changes the actor and can make such failures appear or vanish; that's repo config, not branch-fixable.
5. Transient/infra suspicion (network timeout, runner death, known-flaky test): use the single rerun — `gh run rerun <id> --failed`; GitLab: `glab ci retry <job-id>` per failed job (the argument-less form is interactive and hangs) or `glab api -X POST "projects/:fullpath/pipelines/<id>/retry"`. Green → Phase 5 with the rerun ID. Red again → real failure.
6. Missing secret / permissions / infra outage → not fixable from here. Stop and report exactly what's missing.
7. No identifiable cause in the logs → no blind changes, no blind pushes. Name the missing context, stop.

## Phase 3 — Reproduce & fix locally

1. Re-run the failing command locally, matching CI as closely as possible (same tool versions, flags, clean install). If it can't run locally (CI-only secrets/services), fall back to hypothesis → minimal fix → let CI verify (a red result consumes an iteration).
2. Trace the error to its concrete cause; read the bumped version's changelog/release notes instead of guessing breaking changes.
3. Apply the **minimal** fix that adapts the code to the new version. No drive-by refactoring, nothing unrelated — the diff must stay reviewable as "dependency update + necessary adaptation".
4. If the update itself is incompatible (upstream bug, unsupported platform): don't force it. Document the incompatibility on the MR (if Phase-0 allows writes, else in the final report), suggest the latest compatible version or the needed migration, and stop.

## Phase 4 — Verify locally, then push

- The originally failing command now passes; affected tests pass; the repo's full verify command (Phase 0.5) passes if one exists.
- `git diff origin/<target>...HEAD` contains **only** the dependency update plus documented fixes.
- Push — applying the force-with-lease rule from the safety block if history was rewritten.

## Phase 5 — Watch the run you triggered

1. Identify the run for **your** push SHA or your rerun: `gh run list --commit <sha>`; GitLab: `glab ci get --merge-request=<iid> --output json` and assert its `sha` equals the pushed commit. An older green run proves nothing.
2. Watch to completion: `gh run watch <id>` / `gh pr checks <n> --watch` / poll the glab command above.
3. Red → back to Phase 2 (consumes an iteration). Green → merge gate.

## Merge gate — immediately before merging (earlier answers expire)

- [ ] Right MR, right branch — this is the dependency update that was worked on.
- [ ] Branch contains the current target-branch tip; new commits landed since the last rebase → back to Phase 1.
- [ ] Forge reports mergeable, no conflicts.
- [ ] Latest pipeline on the latest commit fully green. (GitLab merge trains: the train pipeline can still fail — arming ≠ merged.)
- [ ] Required approvals & policies satisfied — the skill never approves anything; a missing approval is a blocker to report, not to work around.
- [ ] Phase-0 merge opt-in given, and this is not an unapproved major-equivalent (Phase 0.3).
- [ ] If the skill authored code changes beyond manifest/lockfile: show the final diff via AskUserQuestion and get a fresh yes — the Phase-0 opt-in predates this code and does not cover it.

Any box open → stop and report the blocker.

## Phase 6 — Merge & confirm

1. Already mergeable now → merge synchronously with the repo's method: `gh pr merge <n> --squash|--merge|--rebase` / `glab mr merge <iid>`. (`gh pr merge --auto` errors on an already-clean PR.)
2. Only waiting on checks → arm auto-merge (`gh pr merge <n> --auto …`, requires the repo setting `autoMergeAllowed`; `glab mr merge <iid> --auto-merge`) **only if** branch protection enforces what the gate checked (required checks, up-to-date branch); otherwise keep watching and merge synchronously once clean.
3. Watch until the merge is confirmed (`gh pr view <n> --json state,mergedAt` / `glab mr view <iid>`). If the status flips back (new conflict, red check, dropped approval) → re-run the merge gate; never continue silently.

## Stop state

Whenever stopping with pushed-but-unfinished work (cap reached, blocker hit): state on the MR — or in the report, if writes weren't allowed — that the branch was taken over, is partially fixed, and is no longer bot-maintained; or revert your commits. Never leave this implicit.

## Final report (per MR)

| | |
|---|---|
| Repo / MR / branch | … |
| Dependency update(s) | pkg old → new, semver classification (Phase 0.3) |
| Rebase | needed? by bot or takeover? conflicts resolved (which, how) |
| CI failure | first causal job + command, classification, reruns used |
| Root cause & fix | … |
| Verification | local commands run · remote run URL + result |
| Merge | merged / auto-merge armed / left ready — confirmed how? |
| Blockers / not verified | everything the skill stopped on or could not check |

State plainly what was **not** verified — an honest "stopped: approval missing" beats an optimistic "done".
