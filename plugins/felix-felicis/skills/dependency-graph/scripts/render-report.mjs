#!/usr/bin/env node
import { existsSync, readFileSync, writeFileSync } from "node:fs"
import { join } from "node:path"

const outDir = process.argv[2]
if (!outDir || !existsSync(join(outDir, "graph.json"))) {
  console.error("usage: render-report.mjs <out-dir>   (the directory dependency-graph.sh wrote graph.json into)")
  process.exit(2)
}

const graph = JSON.parse(readFileSync(join(outDir, "graph.json"), "utf8"))
const recommendationsPath = join(outDir, "recommendations.json")
const recommendations = existsSync(recommendationsPath) ? JSON.parse(readFileSync(recommendationsPath, "utf8")) : undefined

const escapeHtml = (text) =>
  String(text).replace(/[&<>"']/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[character])

const edgeKey = (edge) => `${edge.from}\u0000${edge.to}`
const cutEdgeKeys = new Set(graph.cycles.flatMap((cycle) => cycle.cutCandidates.map(edgeKey)))
const leakEdgeKeys = new Set(graph.leakEdges.map(edgeKey))
const importCount = graph.edges.reduce((sum, edge) => sum + edge.count, 0)

const readInlineSvg = (fileName) => {
  const svgPath = join(outDir, fileName)
  if (!existsSync(svgPath)) return ""
  const svgSource = readFileSync(svgPath, "utf8")
  return svgSource
    .slice(svgSource.indexOf("<svg"))
    .replace("<svg", '<svg class="mx-auto" style="max-width:100%;max-height:85vh;width:auto;height:auto"')
}

const STRENGTH_STYLES = {
  Strong: "bg-emerald-100 text-emerald-800",
  "Worth exploring": "bg-amber-100 text-amber-800",
  Speculative: "bg-slate-200 text-slate-700",
}

const renderFileList = (files) =>
  `<ul class="font-mono text-sm text-slate-600 space-y-0.5">${files.map((file) => `<li>${escapeHtml(file)}</li>`).join("")}</ul>`

const renderMermaidPanel = (heading, source) => `
  <div class="rounded-lg border border-slate-200 bg-white p-4">
    <div class="text-xs uppercase tracking-wider text-slate-500 mb-2">${heading}</div>
    <pre class="mermaid flex justify-center">${escapeHtml(source)}</pre>
  </div>`

const candidateAnchor = (index) => `candidate-${index + 1}`

const renderCandidate = (candidate, index) => `
  <article id="${candidateAnchor(index)}" class="rounded-xl border border-slate-200 bg-white p-6 shadow-sm space-y-4">
    <div class="flex flex-wrap items-center gap-2">
      <h3 class="text-xl font-serif font-semibold mr-2">${index + 1}. ${escapeHtml(candidate.title)}</h3>
      <span class="rounded-full px-2.5 py-0.5 text-xs font-medium ${STRENGTH_STYLES[candidate.strength] ?? STRENGTH_STYLES.Speculative}">${escapeHtml(candidate.strength)}</span>
      <span class="rounded-full bg-indigo-50 px-2.5 py-0.5 text-xs font-medium text-indigo-700">${escapeHtml(candidate.kind)}</span>
    </div>
    ${renderFileList(candidate.files ?? [])}
    <div class="grid gap-4 md:grid-cols-2">
      ${renderMermaidPanel("Before", candidate.before)}
      ${renderMermaidPanel("After", candidate.after)}
    </div>
    <p><span class="font-semibold">Problem.</span> ${escapeHtml(candidate.problem)}</p>
    <p><span class="font-semibold">Solution.</span> ${escapeHtml(candidate.solution)}</p>
    <ul class="flex flex-wrap gap-2">${(candidate.wins ?? []).map((win) => `<li class="rounded bg-emerald-50 px-2 py-1 text-sm text-emerald-800">${escapeHtml(win)}</li>`).join("")}</ul>
  </article>`

const renderRecommendations = () => {
  if (!recommendations) {
    return `<section class="rounded-xl border border-dashed border-slate-300 p-6 text-slate-500">No recommendations yet: write <code>recommendations.json</code> next to <code>graph.json</code> and rerun <code>render-report.mjs</code>.</section>`
  }
  const topIndex = recommendations.candidates.findIndex((candidate) => candidate.title === recommendations.top?.candidate)
  const topSection = recommendations.top
    ? `<section class="deep rounded-xl p-6 text-white space-y-2">
        <div class="text-xs uppercase tracking-wider text-slate-300">Top recommendation</div>
        <h2 class="text-2xl font-serif"><a class="underline decoration-slate-500 underline-offset-4" href="#${candidateAnchor(Math.max(topIndex, 0))}">${escapeHtml(recommendations.top.candidate)}</a></h2>
        <p class="text-slate-200">${escapeHtml(recommendations.top.why)}</p>
      </section>`
    : ""
  return `<section id="candidates" class="space-y-8">
      <h2 class="text-2xl font-serif font-semibold">Candidates</h2>
      ${recommendations.candidates.map(renderCandidate).join("")}
    </section>
    ${topSection}`
}

const renderStatTile = (label, value, accent = "text-slate-900") => `
  <div class="rounded-lg border border-slate-200 bg-white px-4 py-3">
    <div class="text-xs uppercase tracking-wider text-slate-500">${label}</div>
    <div class="text-2xl font-semibold ${accent}">${value}</div>
  </div>`

const renderEvidence = (edge) => `
  <details class="ml-4">
    <summary class="cursor-pointer text-sm text-slate-600">${escapeHtml(edge.from)} → ${escapeHtml(edge.to)} <span class="text-slate-400">(${edge.count}×)</span></summary>
    ${renderFileList(edge.imports)}
  </details>`

const renderCycleGroup = (cycle) => `
  <div class="rounded-lg border border-red-200 bg-white p-4 space-y-2">
    <div class="font-medium">${cycle.group.map(escapeHtml).join(" · ")}</div>
    ${cycle.mutualPairs
      .map(
        ([weaker, stronger]) => `
      <div class="text-sm"><span class="font-mono">${escapeHtml(weaker.from)} ↔ ${escapeHtml(weaker.to)}</span>: ${stronger.count}× one way, <span class="text-red-700">${weaker.count}× back</span></div>
      ${renderEvidence(weaker)}`,
      )
      .join("")}
    ${cycle.longerCycles
      .map(
        (cycleEdges) => `
      <div class="text-sm font-mono">${[...cycleEdges.map((edge) => edge.from), cycleEdges[0].from].map(escapeHtml).join(" → ")}</div>
      ${cycleEdges.map(renderEvidence).join("")}`,
      )
      .join("")}
  </div>`

const renderLeaks = () => {
  if (graph.layerOrder.length === 0) return `<p class="text-slate-500">No layer order given.</p>`
  const leakList = graph.leakEdges.length === 0 ? `<p class="text-slate-500">None.</p>` : graph.leakEdges.map(renderEvidence).join("")
  const unranked =
    graph.unrankedFolders.length > 0
      ? `<p class="text-sm text-slate-500">Not in the layer order (unchecked): ${graph.unrankedFolders.map(escapeHtml).join(", ")}</p>`
      : ""
  return `<p class="text-sm text-slate-600">Layer order, top to bottom: <span class="font-mono">${graph.layerOrder.map(escapeHtml).join(" → ")}</span></p>${leakList}${unranked}`
}

const renderMatrix = () => {
  const countByKey = new Map(graph.edges.map((edge) => [edgeKey(edge), edge.count]))
  const maximumCount = Math.max(1, ...graph.edges.map((edge) => edge.count))
  const cellFor = (fromFolder, toFolder) => {
    if (fromFolder === toFolder) return `<td class="bg-slate-100"></td>`
    const key = edgeKey({ from: fromFolder, to: toFolder })
    const count = countByKey.get(key)
    if (!count) return `<td></td>`
    const intensity = (0.12 + 0.88 * (Math.log(count + 1) / Math.log(maximumCount + 1))).toFixed(2)
    const isHighlighted = cutEdgeKeys.has(key) || leakEdgeKeys.has(key)
    const background = isHighlighted ? `rgba(220,38,38,${intensity})` : `rgba(71,85,105,${intensity})`
    const textColor = Number(intensity) > 0.5 ? "text-white" : "text-slate-900"
    return `<td class="text-center ${textColor}" style="background:${background}" title="${escapeHtml(fromFolder)} → ${escapeHtml(toFolder)}">${count}</td>`
  }
  const headerCells = graph.folders
    .map((folder) => `<th class="px-1 py-2 font-normal"><div class="[writing-mode:vertical-rl] rotate-180 whitespace-nowrap">${escapeHtml(folder)}</div></th>`)
    .join("")
  const rows = graph.folders
    .map(
      (fromFolder) =>
        `<tr><th class="pr-3 text-right font-normal whitespace-nowrap">${escapeHtml(fromFolder)}</th>${graph.folders.map((toFolder) => cellFor(fromFolder, toFolder)).join("")}</tr>`,
    )
    .join("")
  return `<div class="overflow-auto"><table class="text-xs font-mono [&_td]:min-w-7 [&_td]:h-7 [&_td]:border [&_td]:border-white"><thead><tr><th class="text-left text-slate-400 font-normal">from ↓ to →</th>${headerCells}</tr></thead><tbody>${rows}</tbody></table></div>`
}

const renderHeaviestPairs = () => {
  const heaviestEdges = [...graph.edges].sort((edgeA, edgeB) => edgeB.count - edgeA.count).slice(0, 10)
  const maximumCount = heaviestEdges[0]?.count ?? 1
  return heaviestEdges
    .map(
      (edge) => `
    <div class="grid grid-cols-[minmax(0,24rem)_1fr_3rem] items-center gap-3 text-sm">
      <span class="font-mono truncate">${escapeHtml(edge.from)} → ${escapeHtml(edge.to)}</span>
      <span class="h-2 rounded bg-indigo-500" style="width:${((edge.count / maximumCount) * 100).toFixed(1)}%"></span>
      <span class="text-right text-slate-500">${edge.count}×</span>
    </div>`,
    )
    .join("")
}

const section = (title, body, fullSizeFile) => `
  <section class="space-y-4">
    <h2 class="text-2xl font-serif font-semibold">${title}${fullSizeFile ? ` <a class="ml-2 align-middle text-sm font-sans font-normal text-indigo-600 underline" href="${fullSizeFile}">full size</a>` : ""}</h2>
    ${body}
  </section>`

const cyclesSvg = readInlineSvg("cycles.svg")
const overviewSvg = readInlineSvg("overview.svg")
const problemSummary =
  graph.cycles.length === 0 && graph.leakEdges.length === 0
    ? `<p class="text-emerald-700">No cycles${graph.layerOrder.length > 0 ? " and no upward leaks" : ""} at depth ${graph.groupingDepth}.</p>`
    : `<p class="text-slate-600">${graph.cycles.length} cycle group(s) and ${graph.leakEdges.length} upward leak(s) at depth ${graph.groupingDepth}.</p>`
const today = new Date().toISOString().slice(0, 10)

const html = `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <title>Dependency graph for ${escapeHtml(graph.repository)}</title>
    <script src="https://cdn.tailwindcss.com"></script>
    <script type="module">
      import mermaid from "https://cdn.jsdelivr.net/npm/mermaid@11/dist/mermaid.esm.min.mjs";
      mermaid.initialize({ startOnLoad: true, theme: "neutral", securityLevel: "loose" });
    </script>
    <style>
      .deep { background: linear-gradient(135deg, #0f172a, #1e293b); }
    </style>
  </head>
  <body class="bg-stone-50 text-slate-900 font-sans">
    <main class="max-w-6xl mx-auto px-6 py-12 space-y-12">
      <header class="space-y-4">
        <h1 class="text-4xl font-serif font-semibold">Dependency graph for ${escapeHtml(graph.repository)}</h1>
        <p class="text-slate-500">${today} · <span class="font-mono">${escapeHtml(graph.sourceRoot)}</span> grouped at depth ${graph.groupingDepth}</p>
        <div class="grid grid-cols-2 md:grid-cols-5 gap-3">
          ${renderStatTile("Files", graph.filesCruised)}
          ${renderStatTile("Folders", graph.folders.length)}
          ${renderStatTile("Cross-folder imports", importCount)}
          ${renderStatTile("Cycle groups", graph.cycles.length, graph.cycles.length > 0 ? "text-red-600" : "text-emerald-600")}
          ${renderStatTile("Upward leaks", graph.layerOrder.length > 0 ? graph.leakEdges.length : "–", graph.leakEdges.length > 0 ? "text-red-600" : "text-slate-900")}
        </div>
        <p class="text-xs uppercase tracking-wider text-slate-500">Legend: red border = folder in a cycle · red edge = cheapest cut · red dashed = upward leak · thicker = more imports</p>
      </header>
      ${section(
        "The whole picture",
        `<p class="text-sm text-slate-500">${overviewSvg ? "Top-level folders" : `Folders at depth ${graph.groupingDepth}`}, every import between them.</p>
        <div class="rounded-xl border border-slate-200 bg-white p-4 overflow-auto">${overviewSvg || readInlineSvg("graph.svg")}</div>`,
        overviewSvg ? "overview.svg" : "graph.svg",
      )}
      ${section(
        "Problems",
        `${problemSummary}
        ${cyclesSvg ? `<h3 class="text-lg font-semibold pt-2">Cycles</h3><div class="rounded-xl border border-slate-200 bg-white p-4">${cyclesSvg}</div><a class="text-sm text-indigo-600 underline" href="cycles.svg">full size</a>` : ""}
        ${graph.cycles.map(renderCycleGroup).join("")}
        <h3 class="text-lg font-semibold pt-2">Upward leaks</h3>
        ${renderLeaks()}`,
      )}
      ${renderRecommendations()}
      <div class="border-t border-slate-200 pt-8 text-xs uppercase tracking-wider text-slate-400">Appendix</div>
      ${overviewSvg ? section(`Detail graph (depth ${graph.groupingDepth})`, `<div class="rounded-xl border border-slate-200 bg-white p-4 overflow-auto">${readInlineSvg("graph.svg")}</div>`, "graph.svg") : ""}
      ${section("Heaviest pairs", `<div class="space-y-1.5">${renderHeaviestPairs()}</div>`)}
      ${section("Matrix", renderMatrix())}
    </main>
  </body>
</html>
`

writeFileSync(join(outDir, "report.html"), html)
console.log(join(outDir, "report.html"))
