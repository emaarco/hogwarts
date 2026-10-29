---
name: dependency-graph
description: "Draws the folder-level import graph of a TS/JS or Java/Kotlin codebase (Spring and co): the whole picture first, then folder cycles and upward leaks against a layer order, each traced to the importing files, ending in an HTML report with recommendations. Use before restructuring folders or packages, introducing layers or writing architecture tests, or when asked how folders depend on each other."
disable-model-invocation: true
allowed-tools: Bash, Read, Grep, Glob, AskUserQuestion
---

# Skill: dependency-graph

Collapses every import under a source root into a folder graph, renders it, and drills from the whole picture into the problems. Imports come from dependency-cruiser for TS/JS (static, dynamic `import()`, side-effect and type-only imports) and from the `package` / `import` lines for Java/Kotlin (no build needed); the drawing comes from Graphviz. Everything is written to `$TMPDIR`, the repo stays untouched.

## 1. Pick the inputs

- **Source root**: `src/` for TS/JS, `src/main/kotlin` or `src/main/java` for the JVM: the script descends to the base package by itself. Monorepos and multi-module builds: run once per package or module.
- **Depth**: `1` gives the top-level folders. Use `2` when one folder holds most of the code, e.g. `adapter/in`, `application/port`, `domain/<aggregate>` in a hexagonal service; the report then still opens with the depth-1 overview.
- **Layer order**, top to bottom: an upper layer may import a lower one, never the reverse (`adapter,application,domain` for hexagonal). Take it from the user, or derive it from `CONTRIBUTING.md` / `CLAUDE.md` / existing architecture tests and state the derived order. With none available, run without it: cycles still work.

## 2. Run

From the repo (or module) root:

```bash
bash "${CLAUDE_PLUGIN_ROOT}/skills/dependency-graph/scripts/dependency-graph.sh" src/main/kotlin \
  --depth 2 --layers adapter,application,domain
```

The language is detected from the files (`--lang js|jvm` overrides). The first run installs pinned dependency-cruiser, TypeScript and a WASM Graphviz into `$TMPDIR/dependency-graph-tools`. TS/JS tests (`*.test.*`, `*.spec.*`, `__tests__/`) are excluded unless `--include-tests` is passed.

Output in `$TMPDIR/dependency-graph/<repo>/` (or `--out <dir>`):

| file | content |
| --- | --- |
| `report.html` | the visual report: whole picture, problems, recommendation cards (step 4), appendix with detail graph and heatmap matrix |
| `report.md` | the data as text, for reading in the conversation |
| `overview.png` | the whole picture at depth 1 (only written when `--depth` > 1, otherwise `graph.png` is the overview) |
| `graph.png` / `cycles.png` | all folders at the chosen depth, and only the folders that sit in a cycle |
| `*.mmd` | the same graphs as Mermaid, for pasting into Markdown or a PR |

In the drawings, red-bordered folders sit in a cycle, red edges labelled `cycle` are the cheapest cut per cycle, and red dashed edges labelled `leak` point upward against the layer order. At depth 2 and deeper, folders are boxed by their top-level folder.

## 3. Look, whole picture first

Open the overview (`overview.png`, or `graph.png` at depth 1) with Read and describe the overall shape before any problem: which folders carry the code, which way the dependencies flow. Then drill in: `cycles.png`, the cycle and leak evidence in `report.md`, and the importing files themselves. A detail graph above roughly 60 edges is a hairball: rerun with `--min-weight 3` (or higher), which thins only that drawing.

## 4. Recommend

Turn the findings into candidates (cut a cycle, fix a leak, merge or split folders) and write them as `recommendations.json` into the output directory, following [references/recommendations.md](references/recommendations.md). Then render and open the report:

```bash
node "${CLAUDE_PLUGIN_ROOT}/skills/dependency-graph/scripts/render-report.mjs" <out-dir>
open <out-dir>/report.html   # xdg-open on Linux
```

The run is complete when `report.html` is open and every cycle group and every upward leak is covered by a candidate or named as deliberately left alone. Give the user the absolute path, the whole picture in one sentence, then the top recommendation, and ask which candidate to tackle.

## 5. Hand-off

Offer to turn the layer order into an enforced rule set; dependency-cruiser, ArchUnitTS, ArchUnit and Konsist snippets are in [references/enforce-rules.md](references/enforce-rules.md). Write rules or a `tools/` script into the repo only when the user asks.

## Gotchas

- Only imports between files under the source root count: other packages, modules and libraries are left out.
- JVM: references without an `import` (same package, fully qualified names in code) are not counted; same-package ones never cross a folder anyway.
- A layer order is a straight line, hexagonal architectures often allow exceptions (services wiring outbound adapters). Check existing architecture tests before reporting such an edge as a leak.
- A root-level file and a folder of the same name (`layout.ts` next to `layout/`) merge into one node; files directly inside a folder at depth 2 show as `<folder>/*`.
- TS path aliases resolve through the `tsconfig.json` in the working directory; for a package with its own `tsconfig.json`, run from the package directory.
