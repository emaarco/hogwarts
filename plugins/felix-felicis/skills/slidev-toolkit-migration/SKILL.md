---
name: slidev-toolkit-migration
description: "Migrate an existing Slidev presentation onto the Miragon slidev-toolkit template (@miragon/slidev-toolkit): clone and read the template, scaffold one deck per topic, build a source→toolkit mapping table, enumerate slides with @slidev/parser (never regex), then migrate slide-by-slide by hand behind verify gates (npm run build + npm run verify green per chapter). Use when asked to migrate/port/rebuild a slide deck onto the Miragon template or toolkit, modernise an old Slidev deck, or move slides to the corporate design system."
allowed-tools: Bash, Read, Edit, Write, Grep, Glob, WebFetch, AskUserQuestion
---

# Skill: slidev-toolkit-migration

Migrate an existing Slidev deck onto the **Miragon slidev-toolkit** template
([`Miragon/slidev-deck-template`](https://github.com/Miragon/slidev-deck-template),
design system = `@miragon/slidev-toolkit`). The source deck varies — it may already
have its own theme/components or be plain markdown; the **target is fixed** and this
skill knows it. The output is a clean deck (or one deck per topic) built entirely
from sanctioned layouts and components, passing the template's verify gates.

Runs **in the source deck's repository** (the presentation being migrated), not in
the plugin repo. Work is **deterministic where mechanical, hand-done where semantic** —
see the Prime Directive. **Never push to `origin` except to open a PR. Do not delete
the old design system until the very end, after everything is green.**

## Prime directive — automation vs. handwork

The single most important rule. Get this boundary wrong and you either move slowly or
produce garbage.

- **Scripts do the mechanics** — anything deterministic and reversible: scaffolding
  decks, enumerating slides (`@slidev/parser`), generating `slides.md` / chapter
  skeletons, moving assets into `resources/`, wiring `verify/`, and "what's left"
  reports. Fast, complete, repeatable.
- **You do the semantics by hand, slide by slide** — component→component
  translation, ripping out raw HTML, prose→bullets, splitting overloaded slides.
  **No auto-transform** on slide bodies: a regex/codemod that rewrites content
  produces plausible-looking rubbish. The mapping table + tracking checklist guide
  the handwork; the scripts never touch meaning.

Two shipped scripts back this (`reference/`): `enumerate-slides.mjs` (parser-based
slide checklist) and `leftover-report.mjs` (raw-HTML / old-component progress gate).
Copy them into the deck's tooling and run them from inside the deck.

## Phase 0 — Assess (read before you plan anything)

1. **Clone the template for reference** into `.context/` and read it thoroughly
   before touching the source deck — the toolkit evolves, so the live template is
   the source of truth, not this skill's summaries:
   ```bash
   git clone --depth 1 https://github.com/Miragon/slidev-deck-template.git .context/slidev-deck-template
   ```
   Read, in order: root `README.md` + `CLAUDE.md`; **`.claude/skills/slides/SKILL.md`**
   and its `reference/archetypes.md` + `reference/components.md` (the authoring
   truth); `packages/create-deck/README.md` (scaffolding); `verify/README.md` +
   `verify/rules/` (the gates); the demo `deck/chapter/**`. The 12 archetypes and 5
   component families you may use are whatever those files list **now**.

2. **Survey the source deck.** Map its structure (where slides live, how chapters/
   topics are grouped) and its **design-system maturity**:
   - *Plain markdown, no custom theme* → mapping is light; focus on choosing the
     right archetype per slide.
   - *Has its own theme / components / layouts* (e.g. a `shared/` addon + theme) →
     inventory every custom layout and component; these drive the mapping table.
   - Note raw-HTML-heavy slides and any interactive Vue components (simulators,
     wiring widgets) — likely last-resort customs.
   ```bash
   grep -rlE '<[A-Z][A-Za-z]+' --include=*.md .        # slides using components
   grep -rlE '<(div|span|table|svg|img|style)\b' --include=*.md .   # raw-HTML slides
   ```

3. **Decide the target architecture** and confirm with the user via
   `AskUserQuestion`:
   - **How many decks?** One deck per top-level topic/module (mirrors a per-topic
     workspace layout; each builds independently) **or** a single deck if the source
     is one presentation. Source sub-chapters become template chapters
     `deck/chapter/NN-name/NN-name.md`.
   - **Custom package name** for the single last-resort workspace (e.g.
     `<project>-customs`) — the only custom package that may survive.
   - **PR strategy** — ask up front how to bundle the work: **one PR per topic/deck**
     or **the whole migration in a single PR**. Don't assume per-topic. This is only
     about how commits are grouped for review; it does not change the migration
     cadence (which is always chapter-by-chapter, see Phase 4/5).
   - Confirm the source's speaker-note language is kept (the template allows
     non-English notes; slide **content** must be English).

4. **Write the plan + mapping table first**, into `.context/migration/`:
   - `plan.md` — phases, chapter order, the chosen PR strategy, the pilot sub-chapter.
   - `mapping-table.md` — copy `reference/mapping-table.md` and fill the Source
     columns from step 2. **No slide is migrated until its constructs have a row.**
   - `tracking.md` — the per-slide checklist (generated in Phase 3), plus a
     **Deferred polish** section for rough-but-functional bits (e.g. an awkward
     Excalidraw redraw) to refine after the migration lands.

## Phase 1 — Scaffold the target deck(s)

**Consume the toolkit from npm, pinned to one version across all decks; never vendor
the toolkit source.** Use the shipped `reference/new-topic-deck.sh` — it scaffolds
one deck per topic via the public `@miragon/create-slidev-deck`, strips the demo
chapters, writes a workspace `package.json` + a minimal `slides.md` (cover +
closing), and keeps every deck identical:
```bash
# run from the repo root, once per topic:
reference/new-topic-deck.sh <slug> <@scope/npm-name> "Deck Title"
# offline/deterministic against a local template checkout:
CREATE_DECK_SKELETON=.context/slidev-deck-template reference/new-topic-deck.sh ...
# drop an unused addon: DECK_ADDONS="bpmn" reference/new-topic-deck.sh ...   (no dmn)
```
Then add `decks/*` to the root `package.json` workspaces (once), wire numbered root
scripts (`mdeck:N` / `mbuild:N` / `mverify:N`) so any deck runs from the root, and
`npm install`. Commit each `package-lock.json` (CI runs `npm ci`). The scaffold
already ships `deck/`, `verify/`, `.claude/`, `CLAUDE.md`, and the Build Deck + Pin
Check workflows — don't recreate them. Create the single `<project>-customs`
workspace only if the mapping genuinely forces it (a disciplined migration may need
none — see Phase 2 rule 4).

## Phase 2 — Map (fill the contract)

Complete `.context/migration/mapping-table.md`: every source layout and component →
a target archetype/component, a best-fit, or an explicit last-resort custom with a
one-line justification. Apply the decision rules in that file, in order:

1. Direct archetype/component if one fits.
2. Best-fit otherwise — **coloured callouts/AlertBox dissolve into bullets or a
   `Card`** (the toolkit has no coloured callout); **exercise/task layouts →
   `content` + `CardGrid`**; **prose → bullets** unless the prose is the point.
3. Split an overloaded slide into two when it exceeds an archetype's limit —
   deliberate, not inflationary.
4. Last resort → `<project>-customs`. **First rebuild** custom components into native
   vocabulary (`Card`/`StepList`/`CodeBlock`/`SplitView`) — a real multi-topic
   migration rebuilt every one and needed **zero** customs. Reserve the package for a
   genuinely irreducible **stateful, interactive** Vue component with no native
   equivalent, ported **as-is**; presentational customs (badges, agendas, code
   windows) get rebuilt, not kept. Log any real custom in the ledger.

## Phase 3 — Enumerate & pilot one sub-chapter

**One file per chapter** (`deck/chapter/NN-name/NN-name.md`) — the template
convention the verify glob depends on. The chapter's first slide is `layout:
section`. Do **not** permanently split slides into one-file-each; enumerate them as a
*working* checklist instead.

Keep `slides.md` **thin**: frontmatter, a `cover`, an `<Agenda>` (it auto-discovers
the `section` chapters — don't hand-maintain it), an optional topic `hero`, a `src:`
import per chapter, and a `closing`. **Wire chapters in incrementally** — add each
`src:` line only once that chapter is migrated, so the deck always builds with just
what's done and a broken in-progress chapter never blocks the build.

Enumerate each old chapter with the shipped `reference/enumerate-slides.mjs` — the
**old-side analyzer** (parser-based, never regex). It writes a per-chapter checklist
to `.context/migration/checklists/<chapter>.md` with, per slide, the old layout + a
suggested toolkit layout, every component used, raw-HTML/hex signals, and last-resort
custom flags. Pass the source deck's own component names (a first run lists what it
sees, so you know what to pass):
```bash
# from inside the deck (so @slidev/parser resolves):
node reference/enumerate-slides.mjs path/to/source-chapter.md \
  --old <old component tags to migrate> --customs <interactive tags to port as-is>
```
`npm run verify` guards the new side; this guards the old side.

Then **fully migrate one pilot sub-chapter end to end** (Phase 4 + Phase 5) before
scaling out. The pilot validates the pipeline *and* the mapping table — fix both
here, where it's cheap, not across eight topics.

## Phase 4 — Migrate, slide by slide (handwork)

For each slide in the tracking checklist:

1. **Pick the archetype** from the mapping table; set `layout:` in frontmatter.
2. **Translate content by hand** into headings + bullets + component tags. Rip out
   raw HTML/CSS/hex. Turn Fließtext into bullets where it's really a list. Move
   assets into the chapter's `resources/` and reference `/resources/<chapter>/<file>`.
3. **Handle every visualisation via the decision tree** (full version in
   `reference/mapping-table.md`). A **content-bearing** visual is **never** flattened
   to Cards and raw `<svg>`/HTML is **never a valid end state** — a migrated slide
   must never look like content was lost. (A purely **decorative** SVG — ornament,
   divider, chrome — is not content: just delete it.) For content, walk top-down,
   stop at the first that works:
   - **a) Live BPMN/DMN → the addon** (`bpmn`/`dmn` layouts, `Bpmn`/`Dmn` components)
     pointed at `.bpmn`/`.dmn` files in the chapter's `resources/`. Merge an old
     "static XML + live modeler" pair into one `SplitView`.
   - **b) Static diagram → Excalidraw *or* Mermaid** (the toolkit supports both; pick
     by the template's decision rule):
     - **Mermaid** when the diagram is a **standard graph type that reads as text and
       wants auto-layout** — a flow, sequence/interaction, state machine, ER, or
       decision tree. Payoff: the source is a few diffable lines. Use a native
       ` ```mermaid ` fence (no addon), inline or imported with
       `<<< @/chapter/<chapter>/resources/<name>.mermaid`. It's brand-styled globally
       by `deck/setup/mermaid.ts` — **never put hex/theme in the slide**; shrink a
       tall one with `` ```mermaid {scale: 0.8} ``, not by editing the theme.
     - **Excalidraw `.excalidraw.svg`** (the **default**, via `<Figure src>` and the
       template's `excalidraw` skill) when **placement carries meaning** — freeform
       architecture sketches, deliberately arranged boxes, custom shapes, hand-drawn
       polish. That's most deck diagrams; Mermaid's auto-layout looks generic there.
       One-time, bootstrap the exporter with `reference/setup-excalidraw.sh` — it
       installs the CLI as a **local devDependency** (no global install), handles the
       Firefox-revision mismatch + macOS keyboard patch — then export a scene JSON
       into the chapter's `resources/` via `npx excalidraw-brute-export-cli` (integer
       coordinates only, or the transparency verify check fails).
     - In migration terms: an existing flowchart / sequence / state chart maps
       naturally to **Mermaid**; a hand-drawn `<svg>` architecture picture maps to
       **Excalidraw**. If the Excalidraw redraw is rough, **keep the
       ugly-but-functional version** (must build + verify green) and log "Deferred
       polish"; don't fall further just because it looks off.
   - **c) Untransformable custom-HTML picture → rasterise to PNG.** Only when a redraw
     is genuinely infeasible (a picture built from `<div>`/CSS/SVG, too complex, or
     the conversion erred). Use the shipped `reference/render-svgs-from-md.mjs`
     (Playwright screenshots each inline `<svg>`, writing both `.svg` and `.png` into
     `resources/`); embed the PNG via `<Figure src>` and log "Deferred polish". A
     raster `Figure` is a component, so it passes `no-raw-html`; still confirm the
     16:9 fit.
4. **Keep the speaker notes** (translate nothing; the source language stays).
5. **Split** the slide if it's overloaded (mapping rule 3).
6. Tick it off in `tracking.md`.

Honour the **non-negotiables** throughout (these are the toolkit's, enforced by
verify — the exact set lives in the template's `CLAUDE.md` / `slides` skill, read
them in Phase 0):

- **No raw HTML / CSS / hex** in the markdown — frontmatter + headings + bullets +
  component tags only. Components on one line, explicit closing tags.
- **English only** on slide content; **cards always white** (accent on title only);
  **headings black**, blue only for kickers/accents; **no em-dashes, no emoji**;
  **plain `<ul><li>` bullets, one level** (no nesting, no per-slide restyle).
- **Never shrink the font to fit** — reduce content, split, or use `<v-clicks>`.
- Every chapter starts with a `section` slide; `heroes` pose an active question;
  vary `leftIsGood` across `goodbad` slides.

## Phase 5 — Verify gate (definition of done)

**The migration cadence is chapter-by-chapter:** finish *every* slide in one chapter
(Phase 4), run this gate until green, and only then start the next chapter. Never
interleave half-migrated chapters. This cadence is independent of the PR strategy
chosen in Phase 0 — a single PR may still gather many verified chapters.

Bring the template's `verify/` into the deck and parameterise it per deck. **A
chapter is done only when the production build AND verify are green:**
```bash
npm run build            # PRODUCTION static build — run it, don't skip
npm run verify           # full screenshot + per-slide fit checklist (local, needs a browser)
npm run verify:source    # fast source guardrails (also what CI runs)
```
Then the leftover gate — nothing old must remain:
```bash
node reference/leftover-report.mjs deck/chapter/<chapter>/*.md --old <OldComp1,OldComp2>
```

**`build` ≠ `verify` — run both.** The verify dev-server tolerates errors the static
build rejects. The classic one: **`<` followed by a letter** (`Map<String>`,
`<decision id>`) parses as an open Vue tag and fails `slidev build` with "missing end
tag" — even inside inline code or a table cell — while verify stays green. A green
verify does **not** mean the deck builds.

**Overflow tuning converges fast if you know the mechanism** (full rules +
thresholds in [`reference/build-and-overflow-lessons.md`](reference/build-and-overflow-lessons.md)):
- Fit is **element-COUNT driven, not text-length** — shortening words does nothing;
  remove/merge lines, `Step`s, or bullets, or shrink a `Figure`'s `maxHeight`.
- The real threshold is **≥16px clearance (content ≤536px)**, not ≤552px, and it
  reports two different messages — grep both, or grep `Error: Slide`, or you declare
  victory ~16px early.
- In a `SplitView`, fix the **actually-taller column** first; `CodeBlock`'s `size`
  changes font, not height — remove lines instead.
- **Large decks (~70+ slides) crash the rendered verify mid-run** (a Playwright
  resource limit, not content) — run it in halves: `VERIFY_PAGES="1-40"` then
  `"41-77"`.
- To eyeball **one** slide while tuning, `reference/screenshot-slide.mjs <url> <out.png>`
  screenshots it from the running dev server and prints an overflow probe (content vs
  canvas), without touching the server.

Do not finish a chapter on red. Commit per chapter (or per few) **locally** once
green. Reuse the author's running `npm run dev` for visual checks — never kill it; a
stale *verify* server on 3030 serves source and skews numbers, so ensure a clean
verify run (stop a stuck verify server or set `VERIFY_PORT`).

## Finalisation

- Migrate chapter by chapter (each fully verified per Phase 5), then bundle the work
  into PRs **per the Phase 0 decision** — one PR per topic, or the whole migration in
  a single PR (via `gh`; never push to `origin` outside a PR).
- When every topic is green: rebuild the root full-course entry onto the new decks,
  then **delete the old design-system packages** (e.g. `shared/slidev-theme-*`,
  `shared/*-addon-*`) and retire the old design docs / skills — leaving only
  `<project>-customs` if one was actually needed.
- Update the repo's docs / `CLAUDE.md` to point at the toolkit and the `slides` skill.
- Turn the **Deferred polish** list from `tracking.md` into follow-up issues (e.g.
  rough Excalidraw redraws) so nothing rough-but-functional is silently forgotten.

## Shipped scripts (`reference/`)

Copy these into the deck's tooling (e.g. `scripts/migration/`) and run from inside a
deck. All are repo-agnostic; the parser-based ones need `@slidev/parser` (ships with
Slidev), the Playwright ones need a browser (ships with `verify/`).

| Script | Phase | Does |
|---|---|---|
| `new-topic-deck.sh` | 1 | Scaffold one toolkit deck per topic via `@miragon/create-slidev-deck`, as a workspace |
| `enumerate-slides.mjs` | 3 | Old-side analyzer: per-slide checklist (layout, components, raw signals, suggested layout) via `@slidev/parser` |
| `setup-excalidraw.sh` | 4 | One-time bootstrap of the Excalidraw `.excalidraw.svg` exporter (Firefox-revision + macOS patch) |
| `render-svgs-from-md.mjs` | 4 | Rasterise inline `<svg>` to PNG (the visualisation last-resort fallback) |
| `leftover-report.mjs` | 5 | New-side gate: flag remaining raw-HTML / old components, mirrors the template's `no-raw-html` rule |
| `screenshot-slide.mjs` | 5 | Screenshot one slide + overflow probe, against a running dev server |

## Deliverable — this playbook is the reusable asset

The whole migration distils to: **this skill + the mapping table + the shipped
scripts + the build/overflow lessons + the verify gates.** Keep the mechanical steps
as committed scripts (e.g. under `scripts/migration/`) and turn each recurring gotcha
into project memory, so the next topic — and the next deck — converges faster. After
a real migration, feed new mapping rows, scripts, or lessons back into `reference/`.
