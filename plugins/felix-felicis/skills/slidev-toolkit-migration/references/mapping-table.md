# Mapping table — source deck → Miragon toolkit

Copy this file to `.context/migration/mapping-table.md` at the start of a migration
and fill the **Source** columns from the deck you are migrating. The **Target**
inventory below is fixed by `@miragon/slidev-toolkit`; confirm it against the live
template before you start (`.claude/skills/slides/reference/archetypes.md` and
`components.md` in the cloned template — the toolkit evolves).

The table is the contract for Phase 4: every source layout/component resolves to a
target, a best-fit, or an explicit last-resort custom. No slide gets migrated until
its constructs have a row here.

**Classify each mapping** — a general lens that keeps the last-resort bucket honest:

- **1:1** — direct mapping; only prop names/values change (e.g. an old `Card` → the
  toolkit `Card`, remapping accent values).
- **best-fit** — nearest sanctioned construct, with a light content/structure rebuild.
- **markdown** — the construct dissolves into plain markdown or a layout **prop**;
  no component survives (e.g. a badge → the layout's `eyebrow:`).
- **custom** — genuinely irreducible; goes to `<project>-customs` as a true last
  resort. Aim for zero.

## Target inventory (fixed — verify against the live toolkit)

**12 layout archetypes** (`layout:` in slide frontmatter):
`cover`, `hero`, `person`, `section`, `content`, `content-image`, `compare`,
`goodbad`, `bpmn`, `dmn`, `showcase`, `closing`. Plus the built-in `default`
(full-bleed component slides only). Every chapter's first slide is `section`.

**Component families** (single line in `.md`, explicit closing tags):
`Card` + `CardGrid`, `StepList` + `Step`, `Figure`, `SplitView` (a `#visual` slot +
default slot), `CodeBlock`, plus the BPMN/DMN addon components (`Bpmn`,
`BpmnTokenSimulation`, `DmnTable`, `DmnDrd`). `slides.md` also uses `<Agenda>`, which
**auto-discovers `section` chapters** and renders a stepper from each section's
heading — so you don't hand-maintain an agenda. Confirm the exact set against the
live toolkit; it evolves.

**Diagrams / visuals:** live process → the `bpmn` layout / `Bpmn` components
(`slidev-addon-bpmn`); live decision → the `dmn` layout / `Dmn` components
(`slidev-addon-dmn`); static diagram → **Excalidraw `.excalidraw.svg`** (default, via
`<Figure src>`) **or brand-styled Mermaid** for standard text-generated graphs;
untransformable custom-HTML picture → rasterised PNG via `<Figure src>` (see the
visualisation decision tree below).

## Layout mapping

| Source layout / pattern | Target archetype | Notes / best-fit rule |
|---|---|---|
| title / cover slide | `cover` | 1 statement, animated |
| big statement / transition | `hero` | phrase as an **active question** the next slides answer |
| speaker intro | `person` | solo or duo, bio ≤ 3 lines |
| chapter divider | `section` | first slide of every chapter, ghost index |
| bullets / prose / card grid | `content` | the workhorse; ≤ 5 bullets, one level |
| image + text (two columns) | `content-image` | ≤ 4 bullets, 1 visual |
| before/after, this-vs-that | `compare` | two coloured panels; the layout colours them |
| "which is right, and why?" | `goodbad` | vary `leftIsGood` across the deck |
| process diagram | `bpmn` | `.bpmn` in chapter `resources/` |
| decision table | `dmn` | `.dmn` in chapter `resources/` |
| interactive feature explorer / quiz | `showcase` | 3–4 items |
| closing / thank-you | `closing` | 1 CTA, animated |
| one big number / stat | `hero` | the number as the bold word |
| intro / breaker / divider | `section` | any chapter/topic break → a `section` divider |
| lab / exercise / two-cols-header / bare `default` | `content` | usually with a `SplitView` inside; these custom layouts are **illegal** in the toolkit and must be mapped |
| quote / testimonial | `hero` | the quote as the statement, attribution on the eyebrow/subtitle line |
| generic two-column | `content-image` **or** `SplitView`-in-`content` | visual+text → `content-image`; two text columns → `content` + `CardGrid` |
| _<add source layouts here>_ | | |

These concrete transforms recurred across a real multi-topic migration; use them as
priors, not gospel. Any source layout outside the sanctioned set is illegal and
**must** map to one of the archetypes above.

## Component mapping

| Source component | Target | Best-fit rule |
|---|---|---|
| white card / tile `<div>` | `Card` (in `CardGrid`) | accent on the **title only**, never a coloured bg/border |
| coloured-border / tinted / left-accent card | `Card` | **drop the colour** (design rule) — accent on the title only |
| before/after comparison card | `compare` layout | old `before`/`after` slots → the layout's `left`/`right` panels |
| numbered step card | `StepList` / `Step` | numbered sequence; remember `<Step>` bodies are plain text, not markdown |
| big-number / metric / stat card | `Card` (value large in body) **or** `hero` | no metric layout; a single headline number reads best as a `hero` |
| badge / status pill / kicker component | the layout's `eyebrow:` prop | **markdown class** — a badge is a layout eyebrow, not a component |
| mac-window / chrome'd code component | markdown code fence / `CodeBlock` | drop the window chrome; Slidev renders code natively |
| hardcoded agenda / table-of-contents component | `<Agenda>` | it **auto-discovers** `section` chapters — no hand-maintained list |
| dev placeholder / visual stub | `Figure` placeholder, or delete | keep only if it carried real content |
| animated / case-study hero component | `cover` / `hero` + `Figure` | best-fit rebuild; only a truly interactive one is a custom |
| grid wrapper `<div class="grid …">` | `CardGrid` | no CSS classes in the markdown |
| decorative helper-class wrapper (`kicker`, `subtitle`, …) | layout `eyebrow:` / subtitle prop | not a component — it's frontmatter on the layout |
| labelled step sequence | `StepList` / `Step` | compact sequence beside a diagram |
| captioned visual / image frame | `Figure` | wraps `.excalidraw.svg` and images alike |
| two-column visual + explanation | `SplitView` | `#visual` = diagram/code, default slot = a `StepList` or a second `CodeBlock` |
| two-column code + prose | `SplitView` | `#visual` = the code/diagram; default = `StepList` or `CodeBlock` |
| code window / snippet | `CodeBlock` | pass a file label; `hideHeader` for a bare snippet. `size` changes font, **not** height |
| comparison table / rating matrix (HTML `<div>` grid) | **markdown table** | plain markdown table, not a grid of Cards |
| coloured callout / `AlertBox` / admonition | **dissolve into bullets or a `Card`** | the toolkit has **no coloured callout**; carry the meaning as a bullet or card title, not colour |
| exercise / task panel | best-fit `content` + `CardGrid` | only fall to a custom if that genuinely can't carry it |
| duplicated "static XML slide + live modeler slide" pair | **one** `SplitView` | merge the pair: static/context on one side, the live `Bpmn`/`Dmn` on the other |
| custom Vue component (presentational: badge, agenda, tab/selector, code window) | **rebuild** as `Card`/`CardGrid`/`StepList`/`CodeBlock` | rebuild into native vocabulary first — a real migration mapped *all* of these and needed **zero** customs |
| standard flowchart / sequence / state / ER / decision-tree diagram | brand-styled **Mermaid** fence | a text-generated graph that wants auto-layout; source inline or `<<< @/…/<name>.mermaid`. Theme is global (`deck/setup/mermaid.ts`) — no hex in the slide; scale with `{scale: 0.x}` |
| any SVG (inline, file, or coded component) | `Figure` + `.excalidraw.svg` (or **Mermaid** if it's a standard graph) | **always** redraw — no raw `<svg>` (it fails verify) and no coded-SVG components. Excalidraw when placement carries meaning; Mermaid if it's really a standard flow/sequence/state graph. If the Excalidraw redraw is rough, keep the ugly-but-functional version and log Deferred polish — never keep raw SVG |
| custom-HTML visualisation (a picture drawn from `<div>`/CSS/SVG) | `Figure` + `.excalidraw.svg`, else `Figure` + rendered image | try Excalidraw first; **only if too complex or the conversion errs**, screenshot the rendered element (Playwright) into `resources/` and embed as an image via `<Figure>`. Log under Deferred polish. Never keep the raw markup |
| _<add source components here>_ | | |

**Accent-palette remap.** Old design systems often carry a wide accent palette
(blue/teal/green/**purple/orange**/…). Remap every accent onto the toolkit's
constrained progression (blue → blue-mid → teal → green), folding any non-brand
colours (purple, orange, red) into the nearest blue/green tone. Colour never carries
meaning on a card — the accent lands on the **title only**.

## Visualisation decision tree (never drop a visual to Cards or raw HTML)

**Content-bearing vs. decorative.** A visual that carries information (a diagram,
chart, schematic, screenshot) must **always** land in the design system — a migrated
slide must **never look like content was lost**. A purely **decorative** SVG (an
ornament, divider, or bit of chrome) is not content — just delete it. The tree below
is for content-bearing visuals; **never** flatten one into Cards or leave raw
`<svg>`/HTML. Walk top-down, stop at the first that works:

1. **Live BPMN/DMN** → the addon layouts/components (`bpmn`/`dmn`, `Bpmn`,
   `BpmnTokenSimulation`, `DmnTable`, `DmnDrd`) pointed at `.bpmn`/`.dmn` files copied
   into the chapter's `resources/`. Merge any old "static XML + live modeler" pair
   into one `SplitView`.
2. **Static diagram → Excalidraw (default) or Mermaid.** Pick by the template rule:
   - **Mermaid** if it's a standard graph type that reads as text and wants
     auto-layout (flow, sequence, state machine, ER, decision tree) — a native
     ` ```mermaid ` fence, inline or `<<< @/…/<name>.mermaid`, brand-styled globally
     by `deck/setup/mermaid.ts` (no hex in the slide; scale with `{scale: 0.x}`).
   - **Excalidraw `.excalidraw.svg`** (via `<Figure src>`) when placement carries
     meaning — architecture sketches, deliberately arranged boxes, custom shapes.
     That's most deck diagrams, so it's the default; Mermaid auto-layout looks
     generic there. Rough redraw is fine — keep it and log Deferred polish.
3. **Untransformable custom-HTML picture** (a visual built from `<div>`/CSS/SVG, too
   complex to redraw, or the Excalidraw conversion erred) → **rasterise to PNG** with
   the shipped `render-svgs-from-md.mjs` (Playwright screenshots each inline `<svg>`,
   writing both `.svg` and `.png`), embed the PNG via `<Figure src>`, log Deferred
   polish.

## Decision rules (apply in order)

1. **Direct archetype/component** if one fits — always preferred.
2. **Best-fit** if none is exact: pick the nearest sanctioned layout/component and
   simplify the content to fit its limits, rather than reproducing the old design.
   - Coloured callouts → bullets or a `Card` (never reintroduce colour for meaning).
   - Exercise/task layouts → `content` + `CardGrid`.
   - Fließtext / prose paragraphs → **bullets** (`content`), unless the prose is the point.
3. **Split an overloaded slide** into two when it exceeds an archetype's limit
   (e.g. > 5 bullets, two focal points). Deliberate, not inflationary — don't let
   the deck balloon.
4. **Last resort — `*-customs` package (rarer than it looks).** First **rebuild**
   custom components into native vocabulary (`Card`/`CardGrid`/`StepList`/`CodeBlock`/
   `SplitView`) — a real multi-topic migration mapped every custom component this way
   and needed **zero** customs. Reserve the customs package for the genuinely
   irreducible case: a **stateful, interactive** Vue component with real didactic
   value and no native equivalent (a live simulator/wiring widget), ported **as-is**.
   Presentational customs (badges, agendas, code windows, selectors) are **not** this
   case — rebuild them. Log every real custom below with why 1–3 couldn't carry it.

## Custom components ledger (last resort only)

| Component | Source | Why no toolkit equivalent | Kept as-is? |
|---|---|---|---|
| _<e.g. a live simulator / interactive widget>_ | | stateful, interactive, didactic; no archetype fits | yes |
