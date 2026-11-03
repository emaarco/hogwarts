# Build & overflow lessons — pre-emptive rules

Hard-won from a real multi-topic migration. These are the non-obvious things a naive
migrator gets wrong; internalising them makes the overflow-tuning phase converge in
one or two passes instead of ten. The pixel thresholds come from one toolkit version
(the verify harness evolves) — **treat the numbers as "confirm against your version",
the mechanisms as durable.**

## 1. Overflow is element-COUNT driven, not text-length

The rendered fit-check height is set by the **number of elements in the tallest
column** — code lines, `Step`s, card bullets — not by how long the words are.
Shortening the text inside a line returns a byte-identical height. To shed height you
must **remove or merge elements**:

- remove a line / step / bullet, or merge two wrapped code lines into one;
- drop a comment line from a code block;
- shrink a `Figure`'s `maxHeight`;
- convert a trailing "note" `Card` into a plain sentence — a Card's border + padding
  is much taller than a sentence.

## 2. The real clearance threshold is ≥16px (content ≤536px), not ≤552px

The 16:9 canvas is 552px tall, but the check demands **≥16px clearance**, so content
must be **≤536px**. It reports two *different* messages:

- over 552px → `runs Xpx past the bottom`;
- between 536 and 552 → `only Xpx clear ... needs >= 16px`.

A naive `grep "runs past"` silently misses the second class and you declare victory
~16px too early. **Grep both messages, or grep `Error: Slide`.**

## 3. In a SplitView, fix the actually-taller column first

Editing the shorter column changes nothing — height is the max of the two. Find the
taller column first. And `CodeBlock`'s `size` prop changes **font, not height**
(line-height is fixed), so shrinking the font is useless — **remove lines instead.**

## 4. `<` + a letter breaks the production build (verify won't catch it)

`Map<String>`, `<decision id>`, `C<` parse as an **open Vue tag** → `missing end tag`
on `slidev build`, even inside inline code and table cells. The verify dev-server
tolerates it, so **a green verify does not mean the deck builds.** Always run the
production build too. (`<` followed by a space is safe; `<` followed by a letter is
not — escape it or rephrase.)

## 5. Large decks crash the rendered verify mid-run — check in halves

A ~70+ slide deck dies with `page.evaluate: Target page closed` plus a wake-lock
rejection: a Playwright browser **resource limit, not a content failure.** Run the
fit-check in ranges: `VERIFY_PAGES="1-40"` then `VERIFY_PAGES="41-77"`.

## 6. Layout & component gotchas that drive overflow

- **Code never wraps or scrolls.** A long line (a fully-qualified name, a long call)
  can't shrink — put it on a **full-width `content` slide**, never inside a
  `SplitView` half-column. A `SplitView` with code + ~5 bullets typically overflows
  by ~14px; keep the narrow column to ~4 bullets.
- **Tall / portrait diagrams overflow a `SplitView` column** — cap them with
  `<Figure maxHeight="…px">` (px unit required).
- **`padding="compact"`** (on the layouts/components that accept it) is a real
  overflow lever before you start cutting content.
- **`<Step>` bodies render as PLAIN TEXT, not markdown** — backticks, asterisks, and
  links show literally. Keep `<Step>` bodies plain; put any code/emphasis outside.
- **`<Agenda>` renders all `section` chapters in ONE horizontal row**, labelled by
  each section's `#` heading. Long headings overflow the stepper — **keep chapter
  section headings short** (this only shows up once several chapters are wired).
- **Excalidraw SVG text is also subject to the no-em-dash rule** — verify reads the
  SVG DOM text, so a `—` inside a diagram fails just like one on the slide.

## Operational grit (each cost real time)

- **`build` ≠ `verify`.** Run the production `slidev build` as well as verify — the
  dev-server tolerates errors the static build rejects (see lesson 4).
- **Stale verify server.** The rendered verify boots its own server on port 3030 and
  serves **source, not `dist`**; a leftover one makes numbers stale. Ensure a clean
  run (stop a stuck *verify* server or set `VERIFY_PORT`) — but never kill the
  author's live `npm run dev` you reuse for visual checks.
- **`<Card>` body** must be blank-line block form (blank line after the opening tag),
  or inline markdown renders literally.
- **`content` slides** put the heading in `title:` frontmatter — a body `#` inside a
  content layout double-renders.
- **Static `<Bpmn>` ignores `height`** (it scales to width); shrink it by placing it
  in a narrow `SplitView` column.
- **`<Figure maxHeight>` needs a px unit** (e.g. `maxHeight="360px"`).
- **Excalidraw exports need integer coordinates**, or the transparency verify check
  fails.
- **A cold rendered-verify run can phantom-fail.** The first run after a while may
  hang (Vite dep pre-optimize) or report a stale/phantom failure; a fresh re-run is
  clean in seconds. Don't act on the first cold result — re-run before you believe a
  red.
- **Editorial invariants** the harness enforces: no em-dashes, no HTML entities
  (write the literal character), English-only slide content.
