# Default PR / MR body template

Compact, structured, and always links its issue. Used **only** as a fallback when the repo
defines no PR/MR template of its own.

## Structure rationale

Derived from the common `Why → What → Verification` write-up, with two additions:

- **Issue link at the bottom** — a PR should point at the issue it builds on. Missing in most
  ad-hoc templates; added here as a trailing footer so it's never forgotten but doesn't push the
  substance down.
- **`Verification`** instead of `Usage/Verification` — reviewers care how to *confirm* the change,
  not how to *use* it; keep usage notes in the docs/README, not the PR.

Order is deliberate: **Why** (motivation) before **What** (changes) before **Verification**
(evidence), with the issue reference last. Everything else is optional and included only when it
adds value.

## Template

```markdown
## Why

<Problem, motivation, context — why this change is needed. 1–3 sentences.>

## What

- <Key change, one line each. Keep it compact.>
- <…>

## Verification

<How you verified it works: commands run, tests, manual steps — with the expected result.>

<!-- Optional — include a section only when it applies:
## Breaking changes
<What breaks and the migration path.>

## Out of scope / Follow-ups
<Deliberately-not-done items and any follow-up issues.>

## Screenshots
<Before/after for UI changes.>
-->

Closes #<issue>
<!--
  Issue this PR resolves — keep it as the last line. A closing keyword (Closes / Fixes / Resolves)
  auto-closes the issue on merge to the default branch. Use `Refs #NN` / `Part of #NN` — or a full
  URL — when it should NOT close, or when the issue lives in another repo or an external tracker
  (e.g. Jira).
-->
```

## Filled example

```markdown
## Why

The repo ships no Maven wrapper and there's no global Maven, so `mvn` isn't found and the
project can't be built out of the box. Just like `gradlew` for Gradle, a committed `mvnw`
pins one Maven version for everyone and builds with no global install.

## What

- Add `mvnw`, `mvnw.cmd`, `.mvn/wrapper/maven-wrapper.properties`
- Pin Maven 3.9.16 (latest stable 3.9.x; Maven 4 is still RC)

## Verification

`./mvnw clean install` (requires Java 21) → builds all modules, `./mvnw test` → 7/7 green.

Closes #128
```
