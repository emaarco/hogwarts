# recommendations.json

The judgement layer of `report.html`. The script renders the data (graphs, evidence, matrix); this file adds the candidates and the top recommendation, rendered as cards with a before/after diagram each.

## Finding candidates

Work from `report.md`, and open the importing files before proposing anything: an edge count says *that* folders are coupled, the file says *why*. Every candidate names a concrete change to concrete files.

| kind | source in the report | typical change |
| --- | --- | --- |
| `cut cycle` | a cut candidate (back edge, weakest edge of a cycle) | move the imported type or function down, inject instead of import, or move the importing file up |
| `fix leak` | an upward leak | move the shared type to the lower layer, or resolve the value in the caller and pass it down |
| `merge` | a heaviest pair carrying most of one folder's imports | fold the two folders into one module, or move the heavy side's files across |
| `split` | a folder that sits in several cycles or mixes layers | split it along the layer line so each half has one direction |

One candidate per root cause: three leaks fixed by moving one type are one candidate. Rank by leverage: a one-file change that breaks a whole cycle group comes first.

**Strength**: `Strong` (evidence is unambiguous, the change is local), `Worth exploring` (the fix needs a design decision), `Speculative` (the numbers suggest it, the code may not).

## Format

Written to the run's output directory, next to `graph.json`:

```json
{
  "top": { "candidate": "<title of one candidate>", "why": "<one or two sentences>" },
  "candidates": [
    {
      "title": "Move ModelError's mapping out of shared",
      "strength": "Strong",
      "kind": "cut cycle",
      "files": ["src/shared/utils/cli-error.ts", "src/model/ModelError.ts"],
      "before": "flowchart TB\n  model -->|7| shared\n  shared -.->|1 back| model\n  linkStyle 1 stroke:#dc2626,stroke-width:2px",
      "after": "flowchart TB\n  pipeline -->|maps ModelError| model\n  model -->|7| shared",
      "problem": "One sentence: what hurts.",
      "solution": "One sentence: what changes.",
      "wins": ["≤ 6 words each", "named in folder terms"]
    }
  ]
}
```

- `before` / `after` are Mermaid `flowchart TB` sources showing only the 2 to 5 folders involved, with the real import counts as edge labels. Draw the offending edge dotted (`-.->`) and red via `linkStyle <index> stroke:#dc2626,stroke-width:2px`; the after diagram shows where the dependency went.
- `top.candidate` must equal one candidate's `title`; it links to that card.
- Plain prose, no paragraphs: if a card needs a paragraph, the diagram is missing something.

Render with `node "${CLAUDE_PLUGIN_ROOT}/skills/dependency-graph/scripts/render-report.mjs" <out-dir>`.
