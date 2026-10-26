#!/usr/bin/env node
import { readFileSync, writeFileSync, mkdirSync } from "node:fs"
import { basename, join } from "node:path"
import { parseArgs } from "node:util"

const { values: options, positionals } = parseArgs({
  allowPositionals: true,
  options: {
    root: { type: "string", default: "src" },
    depth: { type: "string", default: "1" },
    layers: { type: "string", default: "" },
    "min-weight": { type: "string", default: "1" },
    out: { type: "string" },
  },
})

const cruiseResultPath = positionals[0]
if (!cruiseResultPath || !options.out) {
  console.error(
    "usage: folder-graph.mjs <depcruise.json> --out <dir> [--root src] [--depth 1] [--layers top,...,bottom] [--min-weight 1]",
  )
  process.exit(2)
}

const sourceRoot = options.root.replace(/\/+$/, "")
const groupingDepth = Number(options.depth)
const minimumDrawnWeight = Number(options["min-weight"])
const layerOrder = options.layers.split(",").map((layer) => layer.trim()).filter(Boolean)
const EVIDENCE_LIMIT = 3
const HIGHLIGHT_COLOR = "#dc2626"
const NEUTRAL_COLOR = "#64748b"

const folderOf = (filePath, depth) => {
  const pathSegments = filePath.slice(sourceRoot.length + 1).split("/")
  const directorySegments = pathSegments.slice(0, -1)
  if (directorySegments.length === 0) return pathSegments[0].replace(/\.[^.]+$/, "")
  return directorySegments.slice(0, depth).join("/")
}

const isInsideRoot = (filePath) => filePath?.startsWith(`${sourceRoot}/`)

const isLocalImport = (dependency) =>
  !dependency.couldNotResolve &&
  !dependency.coreModule &&
  !dependency.dependencyTypes.some((type) => type.startsWith("npm")) &&
  isInsideRoot(dependency.resolved)

const describeImportKind = (dependency) => {
  if (dependency.dynamic) return " (dynamic)"
  if (dependency.dependencyTypes.includes("type-only")) return " (type-only)"
  return ""
}

const edgeKey = (fromFolder, toFolder) => `${fromFolder}\u0000${toFolder}`

const collectFolderEdges = (modules, depth) => {
  const folders = new Set()
  const edges = new Map()
  for (const module of modules.filter((candidate) => isInsideRoot(candidate.source))) {
    const fromFolder = folderOf(module.source, depth)
    folders.add(fromFolder)
    for (const dependency of module.dependencies.filter(isLocalImport)) {
      const toFolder = folderOf(dependency.resolved, depth)
      folders.add(toFolder)
      if (fromFolder === toFolder) continue
      const key = edgeKey(fromFolder, toFolder)
      if (!edges.has(key)) edges.set(key, { from: fromFolder, to: toFolder, count: 0, imports: [] })
      const edge = edges.get(key)
      edge.count += 1
      edge.imports.push(`${module.source} → ${dependency.resolved}${describeImportKind(dependency)}`)
    }
  }
  return { folders: [...folders].sort(), edges: [...edges.values()] }
}

const successorsOf = (folders, edges) => {
  const successors = new Map(folders.map((folder) => [folder, []]))
  for (const edge of edges) successors.get(edge.from).push(edge.to)
  return successors
}

const findCycleGroups = (folders, edges) => {
  const successors = successorsOf(folders, edges)
  let nextIndex = 0
  const indexOf = new Map()
  const lowLink = new Map()
  const stack = []
  const onStack = new Set()
  const groups = []

  const visit = (folder) => {
    indexOf.set(folder, nextIndex)
    lowLink.set(folder, nextIndex)
    nextIndex += 1
    stack.push(folder)
    onStack.add(folder)
    for (const successor of successors.get(folder)) {
      if (!indexOf.has(successor)) {
        visit(successor)
        lowLink.set(folder, Math.min(lowLink.get(folder), lowLink.get(successor)))
      } else if (onStack.has(successor)) {
        lowLink.set(folder, Math.min(lowLink.get(folder), indexOf.get(successor)))
      }
    }
    if (lowLink.get(folder) !== indexOf.get(folder)) return
    const group = []
    let member
    do {
      member = stack.pop()
      onStack.delete(member)
      group.push(member)
    } while (member !== folder)
    if (group.length > 1) groups.push(group.sort())
  }

  for (const folder of folders) if (!indexOf.has(folder)) visit(folder)
  return groups
}

const findShortestCycleThrough = (start, group, edges) => {
  const groupEdges = edges.filter((edge) => group.includes(edge.from) && group.includes(edge.to))
  const successors = successorsOf(group, groupEdges)
  const previousOf = new Map([[start, undefined]])
  const queue = [start]
  while (queue.length > 0) {
    const folder = queue.shift()
    for (const successor of successors.get(folder)) {
      if (successor === start) {
        const path = [folder]
        while (previousOf.get(path[0]) !== undefined) path.unshift(previousOf.get(path[0]))
        return [...path, start]
      }
      if (!previousOf.has(successor)) {
        previousOf.set(successor, folder)
        queue.push(successor)
      }
    }
  }
  return []
}

const layerIndexOf = (folder) => {
  const index = layerOrder.findIndex((layer) => folder === layer || folder.startsWith(`${layer}/`))
  return index === -1 ? undefined : index
}

const isUpwardLeak = (edge) => {
  const fromLayer = layerIndexOf(edge.from)
  const toLayer = layerIndexOf(edge.to)
  return fromLayer !== undefined && toLayer !== undefined && fromLayer > toLayer
}

const formatEvidence = (edge, indent) => [
  ...edge.imports.slice(0, EVIDENCE_LIMIT).map((line) => `${indent}- \`${line}\``),
  ...(edge.imports.length > EVIDENCE_LIMIT ? [`${indent}- … ${edge.imports.length - EVIDENCE_LIMIT} more`] : []),
]

const renderMatrix = (folders, edges) => {
  const countOf = new Map(edges.map((edge) => [edgeKey(edge.from, edge.to), edge.count]))
  const header = `| from \\ to | ${folders.join(" | ")} |`
  const divider = `|---|${folders.map(() => "---:").join("|")}|`
  const rows = folders.map(
    (fromFolder) =>
      `| **${fromFolder}** | ${folders
        .map((toFolder) => (fromFolder === toFolder ? "·" : (countOf.get(edgeKey(fromFolder, toFolder)) ?? "")))
        .join(" | ")} |`,
  )
  return [header, divider, ...rows].join("\n")
}

const byCutPreference = (edgeA, edgeB) => Number(isUpwardLeak(edgeB)) - Number(isUpwardLeak(edgeA)) || edgeA.count - edgeB.count

const weakestOf = (cycleEdges) => cycleEdges.reduce((weakest, edge) => (edge.count < weakest.count ? edge : weakest))

const explainCycleGroup = (group, edgeByKey, edges) => {
  const mutualPairs = edges
    .filter((edge) => group.includes(edge.from) && edge.from < edge.to && edgeByKey.has(edgeKey(edge.to, edge.from)))
    .map((edge) => [edge, edgeByKey.get(edgeKey(edge.to, edge.from))].sort(byCutPreference))
    .sort(([weakerA], [weakerB]) => weakerA.count - weakerB.count)
  const longerCycles = []
  const explainedFolders = new Set(mutualPairs.flat().flatMap((edge) => [edge.from, edge.to]))
  for (const folder of group) {
    if (explainedFolders.has(folder)) continue
    const cyclePath = findShortestCycleThrough(folder, group, edges)
    cyclePath.forEach((member) => explainedFolders.add(member))
    longerCycles.push(cyclePath.slice(1).map((member, index) => edgeByKey.get(edgeKey(cyclePath[index], member))))
  }
  const cutCandidates = [...mutualPairs.map(([weaker]) => weaker), ...longerCycles.map(weakestOf)]
  return { group, mutualPairs, longerCycles, cutCandidates }
}

const renderCycleGroup = ({ group, mutualPairs, longerCycles }) => {
  const lines = [`- **${group.join(", ")}** (${group.length} folders)`]
  for (const [weaker, stronger] of mutualPairs) {
    lines.push(
      `  - ${weaker.from} ↔ ${weaker.to}: ${stronger.from} → ${stronger.to} ${stronger.count}×, back edge ${weaker.from} → ${weaker.to} ${weaker.count}×`,
      ...formatEvidence(weaker, "    "),
    )
  }
  for (const cycleEdges of longerCycles) {
    lines.push(`  - ${[...cycleEdges.map((edge) => edge.from), cycleEdges[0].from].join(" → ")}`)
    for (const edge of cycleEdges) {
      const cutMarker = edge === weakestOf(cycleEdges) ? " ← weakest" : ""
      lines.push(`    - ${edge.from} → ${edge.to} (${edge.count}×)${cutMarker}`, ...formatEvidence(edge, "      "))
    }
  }
  return lines
}

const renderReport = ({ folders, edges, cycleExplanations, leakEdges, filesCruised }) => {
  const importCount = edges.reduce((sum, edge) => sum + edge.count, 0)
  const lines = [
    `# Folder dependency graph: \`${sourceRoot}\` (depth ${groupingDepth})`,
    "",
    `${filesCruised} files, ${folders.length} folders, ${edges.length} folder edges, ${importCount} cross-folder imports.`,
    "",
    "## Matrix (imports from row to column)",
    "",
    renderMatrix(folders, edges),
    "",
    "## Cycles",
    "",
  ]
  if (cycleExplanations.length === 0) lines.push("None.")
  for (const explanation of cycleExplanations) lines.push(...renderCycleGroup(explanation))
  lines.push("", "## Upward leaks", "")
  if (layerOrder.length === 0) lines.push("No layer order given (`--layers top,...,bottom`).")
  else {
    lines.push(`Layer order, top to bottom: ${layerOrder.join(" → ")}`, "")
    if (leakEdges.length === 0) lines.push("None.")
    for (const edge of leakEdges) lines.push(`- ${edge.from} → ${edge.to} (${edge.count}×)`, ...formatEvidence(edge, "  "))
    const unrankedFolders = folders.filter((folder) => layerIndexOf(folder) === undefined)
    if (unrankedFolders.length > 0) lines.push("", `Not in the layer order (unchecked): ${unrankedFolders.join(", ")}`)
  }
  lines.push("", "## Heaviest pairs", "")
  for (const edge of [...edges].sort((a, b) => b.count - a.count).slice(0, 10)) {
    lines.push(`- ${edge.from} → ${edge.to} (${edge.count}×)`)
  }
  return `${lines.join("\n")}\n`
}

const penWidthFor = (count) => (1 + Math.log2(count)).toFixed(1)

const classifyEdge = (edge, { cutEdges, leakEdges }) => {
  if (leakEdges.includes(edge)) return { color: HIGHLIGHT_COLOR, label: `${edge.count} leak`, dashed: true }
  if (cutEdges.includes(edge)) return { color: HIGHLIGHT_COLOR, label: `${edge.count} cycle`, dashed: false }
  return { color: NEUTRAL_COLOR, label: `${edge.count}`, dashed: false }
}

const drawnEdgesOf = (graph) =>
  graph.edges.filter(
    (edge) =>
      graph.drawsEveryEdge ||
      graph.cutEdges.includes(edge) ||
      graph.leakEdges.includes(edge) ||
      edge.count >= minimumDrawnWeight,
  )

const topLevelOf = (folder) => folder.split("/")[0]

const renderNode = (folder, graph, label = folder) =>
  graph.cycleFolders.has(folder)
    ? `"${folder}" [label="${label}", color="${HIGHLIGHT_COLOR}", penwidth=2];`
    : `"${folder}" [label="${label}", color="${NEUTRAL_COLOR}"];`

const renderClusteredNodes = (graph) => {
  const foldersByTopLevel = Map.groupBy(graph.folders, topLevelOf)
  return [...foldersByTopLevel].flatMap(([topLevel, members]) => {
    const isSingleNode = members.length === 1 && members[0] === topLevel
    if (isSingleNode) return [`  ${renderNode(topLevel, graph)}`]
    return [
      `  subgraph "cluster_${topLevel}" {`,
      `    label="${topLevel}"; labeljust="l"; style="rounded,filled"; fillcolor="#f8fafc"; color="#cbd5e1"; fontcolor="#475569";`,
      ...members.map((member) => `    ${renderNode(member, graph, member === topLevel ? `${topLevel}/*` : member.slice(topLevel.length + 1))}`),
      "  }",
    ]
  })
}

const renderDot = (graph) => {
  const isClustered = graph.depth > 1
  const nodeLines = isClustered ? renderClusteredNodes(graph) : graph.folders.map((folder) => `  ${renderNode(folder, graph)}`)
  const edgeLines = drawnEdgesOf(graph).map((edge) => {
    const { color, label, dashed } = classifyEdge(edge, graph)
    const style = dashed ? ', style="dashed", constraint=false' : ""
    return `  "${edge.from}" -> "${edge.to}" [label="${label}", color="${color}", fontcolor="${color}", penwidth=${penWidthFor(edge.count)}${style}];`
  })
  const layers = layerOrder
    .map((_, layerIndex) => graph.folders.filter((folder) => layerIndexOf(folder) === layerIndex))
    .filter((members) => members.length > 0)
  const layerRankLines = isClustered
    ? []
    : layers.map((members) => `  { rank=same; ${members.map((member) => `"${member}"`).join("; ")} }`)
  const layerOrderLines = layers
    .slice(1)
    .map((members, index) => `  "${layers[index].at(-1)}" -> "${members[0]}" [style=invis];`)
  return [
    "digraph folders {",
    '  graph [rankdir=TB, newrank=true, nodesep=0.4, ranksep=0.8, fontname="Helvetica", bgcolor="white"];',
    '  node [shape=box, style="rounded,filled", fillcolor="white", fontname="Helvetica", fontsize=12];',
    '  edge [fontname="Helvetica", fontsize=10, arrowsize=0.7];',
    ...nodeLines,
    ...edgeLines,
    ...layerRankLines,
    ...layerOrderLines,
    "}",
    "",
  ].join("\n")
}

const renderMermaid = (graph) => {
  const idOf = new Map(graph.folders.map((folder, index) => [folder, `f${index}`]))
  const drawnEdges = drawnEdgesOf(graph)
  const nodeLines = graph.folders.map((folder) => `  ${idOf.get(folder)}["${folder}"]`)
  const edgeLines = drawnEdges.map((edge) => {
    const { label, dashed } = classifyEdge(edge, graph)
    return `  ${idOf.get(edge.from)} ${dashed ? "-.->" : "-->"}|"${label}"| ${idOf.get(edge.to)}`
  })
  const highlightedIndexes = drawnEdges.flatMap((edge, index) =>
    classifyEdge(edge, graph).color === HIGHLIGHT_COLOR ? [index] : [],
  )
  const cycleNodeIds = [...graph.cycleFolders].filter((folder) => idOf.has(folder)).map((folder) => idOf.get(folder))
  return [
    "flowchart TD",
    ...nodeLines,
    ...edgeLines,
    ...(highlightedIndexes.length > 0
      ? [`  linkStyle ${highlightedIndexes.join(",")} stroke:${HIGHLIGHT_COLOR},stroke-width:2px`]
      : []),
    ...(cycleNodeIds.length > 0
      ? [`  classDef cycle stroke:${HIGHLIGHT_COLOR},stroke-width:2px`, `  class ${cycleNodeIds.join(",")} cycle`]
      : []),
    "",
  ].join("\n")
}

const byLayerThenName = (folderA, folderB) =>
  (layerIndexOf(folderA) ?? -1) - (layerIndexOf(folderB) ?? -1) || folderA.localeCompare(folderB)

const cruiseResult = JSON.parse(readFileSync(cruiseResultPath, "utf8"))
const filesCruised = cruiseResult.modules.filter((module) => isInsideRoot(module.source)).length

const analyze = (depth) => {
  const { folders: unsortedFolders, edges } = collectFolderEdges(cruiseResult.modules, depth)
  const folders = unsortedFolders.sort(byLayerThenName)
  const edgeByKey = new Map(edges.map((edge) => [edgeKey(edge.from, edge.to), edge]))
  const cycleExplanations = findCycleGroups(folders, edges).map((group) => explainCycleGroup(group, edgeByKey, edges))
  const cycleFolders = new Set(cycleExplanations.flatMap((explanation) => explanation.group))
  const cutEdges = cycleExplanations.flatMap((explanation) => explanation.cutCandidates)
  const leakEdges = edges.filter(isUpwardLeak)
  return { depth, folders, edges, cycleExplanations, cycleFolders, cutEdges, leakEdges, filesCruised }
}

const graph = analyze(groupingDepth)
const { folders, edges, cycleExplanations, cycleFolders, leakEdges } = graph

mkdirSync(options.out, { recursive: true })
const report = renderReport(graph)
writeFileSync(join(options.out, "report.md"), report)
writeFileSync(
  join(options.out, "graph.json"),
  JSON.stringify(
    {
      repository: basename(process.cwd()),
      sourceRoot,
      groupingDepth,
      layerOrder,
      filesCruised,
      folders,
      edges,
      cycles: cycleExplanations,
      leakEdges,
      unrankedFolders: layerOrder.length > 0 ? folders.filter((folder) => layerIndexOf(folder) === undefined) : [],
    },
    null,
    2,
  ),
)
writeFileSync(join(options.out, "graph.dot"), renderDot(graph))
if (groupingDepth > 1) writeFileSync(join(options.out, "overview.dot"), renderDot({ ...analyze(1), drawsEveryEdge: true }))
writeFileSync(join(options.out, "graph.mmd"), renderMermaid(graph))
if (cycleExplanations.length > 0) {
  const isInsideOneGroup = (edge) =>
    cycleExplanations.some(({ group }) => group.includes(edge.from) && group.includes(edge.to))
  const cycleView = {
    ...graph,
    drawsEveryEdge: true,
    folders: folders.filter((folder) => cycleFolders.has(folder)),
    edges: edges.filter(isInsideOneGroup),
  }
  writeFileSync(join(options.out, "cycles.dot"), renderDot(cycleView))
  writeFileSync(join(options.out, "cycles.mmd"), renderMermaid(cycleView))
}
process.stdout.write(report)
