#!/usr/bin/env node
/**
 * Rasterise hand-authored inline SVG diagrams from Slidev markdown to PNG, so a
 * custom-HTML visualisation can be embedded on-brand via `<Figure src>` instead of
 * left as raw `<svg>` (which fails verify and never survives a migration).
 *
 * This is the **visualisation fallback**, not the first choice. The decision tree:
 *   1. Live BPMN/DMN → the addon components pointed at .bpmn/.dmn in resources/.
 *   2. A real diagram → Excalidraw `.excalidraw.svg` (default, placement-driven) or a
 *      brand-styled Mermaid fence (standard flow/sequence/state/ER graphs).
 *   3. Only when redraw is infeasible (a picture built from `<div>`/CSS/SVG, too
 *      complex, or the conversion erred) → rasterise it here. Never drop a
 *      visualisation to Cards or leave raw HTML.
 *
 * For each `<svg>…</svg>` block found, it writes the `.svg` source and a `.png`
 * screenshot (tight to the SVG's bounding box) into the output dir, so you commit
 * both and reference the PNG: `<Figure src="/resources/<chapter>/<name>.png">`.
 *
 * Extracting `<svg>` blocks is content extraction, not slide-boundary logic, so a
 * regex is fine here (unlike slide splitting, which must use @slidev/parser).
 *
 * Usage (run from the deck, where Playwright resolves — it ships with verify/):
 *   node render-svgs-from-md.mjs <file.md> [more.md ...] --out deck/chapter/NN/resources
 *   node render-svgs-from-md.mjs <file.md> --dry-run     # list SVGs, don't render
 */
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs'
import { basename, join } from 'node:path'

const args = process.argv.slice(2)
const dryRun = args.includes('--dry-run')
const outIdx = args.indexOf('--out')
const outDir = outIdx >= 0 ? args[outIdx + 1] : '.'
const files = args.filter((a, i) => !a.startsWith('--') && !(outIdx >= 0 && i === outIdx + 1))

if (files.length === 0) {
  console.error('usage: node render-svgs-from-md.mjs <file.md> [more.md ...] [--out <dir>] [--dry-run]')
  process.exit(1)
}

const SCALE = Number(process.env.SCALE || 2) // crisper raster via a higher device scale

/** All top-level <svg>…</svg> blocks in a markdown source, with xmlns ensured. */
function extractSvgs(src) {
  return (src.match(/<svg[\s\S]*?<\/svg>/gi) ?? []).map((svg) =>
    /xmlns=/.test(svg) ? svg : svg.replace('<svg', '<svg xmlns="http://www.w3.org/2000/svg"'),
  )
}

// Collect every (file, name, svg) up front so --dry-run needs no browser.
const jobs = []
for (const file of files) {
  const svgs = extractSvgs(readFileSync(file, 'utf8'))
  const stem = basename(file).replace(/\.md$/, '')
  svgs.forEach((svg, i) => {
    const name = svgs.length > 1 ? `${stem}-svg-${i + 1}` : `${stem}-svg`
    jobs.push({ file, name, svg })
  })
}

console.log(`Found ${jobs.length} inline SVG block(s) across ${files.length} file(s).`)
for (const j of jobs) console.log(`  ${j.file} → ${j.name}.svg / ${j.name}.png`)

if (dryRun) process.exit(0)
if (jobs.length === 0) process.exit(0)

mkdirSync(outDir, { recursive: true })

// Import Playwright lazily so --dry-run and the usage error never require it.
const { chromium } = await import('playwright')
const browser = await chromium.launch()
const page = await browser.newPage({ deviceScaleFactor: SCALE })
try {
  for (const { name, svg } of jobs) {
    const svgPath = join(outDir, `${name}.svg`)
    const pngPath = join(outDir, `${name}.png`)
    writeFileSync(svgPath, svg)
    // Transparent background so the PNG drops onto the slide cleanly.
    await page.setContent(`<div style="display:inline-block">${svg}</div>`, { waitUntil: 'networkidle' })
    const el = await page.$('svg')
    if (!el) {
      console.warn(`  ! ${name}: SVG did not render, skipped`)
      continue
    }
    await el.screenshot({ path: pngPath, omitBackground: true })
    console.log(`  ✓ ${name}.png`)
  }
} finally {
  await browser.close()
}
