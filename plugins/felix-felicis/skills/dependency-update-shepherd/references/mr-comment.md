# MR comment template

Write the comment for a reviewer who reads only the headline and the table. Follow this template, and leave out the lines that don't apply:

````markdown
### <status> — <one-line outcome>

**What changed:** <n> of <m> updates kept<, `<pkg>` held back | , code adapted in <k> files>.

| Package | Version | Status |
|---|---|---|
| <pkg> | <old> → <new> | ✅ updated |
| <pkg> | <old> → <new> | 🛠️ updated, code adapted |
| <pkg> | <old> → ~~<new>~~ | ⏸️ held back |

**Why:** <failing job> broke (`<command>`).
<bump> → <causal chain, one arrow per hop> → <exact error> (`<error excerpt>`).
<How it was confirmed, e.g. "Confirmed locally: <dep> <good-version> builds, <bad-version> fails.">

**Possible fix:** <the change that would let the held-back bump land> — not applied because <reason>.

**Checks:** <local commands> pass locally · [CI green](<run-url>) · fix in <short-sha> (signed)

<details><summary>⚠️ Things to know</summary>

- <Bot> no longer manages this branch. Don't use `@dependabot rebase` / `@dependabot recreate` (Renovate: the rebase checkbox), it would drop the fix.
- <Bot> will propose `<pkg>` <new> again and fail the same way until <blocker> is fixed upstream<, see <issue-url>>.
</details>
````

- **Status headline** — one of `✅ Ready to merge`, `🔀 Merged`, `📋 Fix prepared, not pushed` (**comment-only**), `⛔ Blocked`. The outcome names the hold-back or the fix (`vitest held back at 5.0.3`, `adapted to the renamed parser API`).
- **Table** — every bump the MR originally carried, one row each, held-back versions struck through.
- **Why** — the causal chain from the bump to the exact error, plus the evidence that proved it (local reproduction, bisected versions, changelog entry). No guesses.
- **Possible fix** — only after a hold-back or a stop: the concrete change a human could make so the bump lands (the call sites to migrate and roughly how many files, the upstream release that would fix it, the blocking library version that adds support), and why the skill did not apply it (out of the Phase 3 budget, a pushed fix came back red, needs a design decision, waits on upstream). Mark an untested idea as `untested`. Never propose a suppression from the safety rules as the fix.
- **Checks** — what passed locally and the CI run for the pushed SHA; a flaky rerun is labelled `flaky, unverified`. Never `CI green` for a run that wasn't green. The bare short SHA is enough, GitHub links it; `(signed)` only after the Phase 4 signature check passed.
- **Links** — only URLs actually found (run, issue, changelog). No known upstream issue → drop the link, never invent one.
- **Things to know** — takeover consequences and what happens to the held-back bump next.
- **comment-only** — add a `<details><summary>📋 Verified fix (diff)</summary>` block with the `diff`, and state why it was not pushed (no signing available, target requires signatures).
- **⛔ Blocked** — replace **Checks** with **Blocked by:** what failed, what remains broken, and what a human must do next.
