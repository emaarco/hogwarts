#!/usr/bin/env node
/**
 * enumerate-slides.mjs — deterministic old-side slide inventory for a toolkit migration.
 *
 * Splits an OLD chapter .md into its individual slides using Slidev's own parser
 * (`@slidev/parser`, never a `---` regex), and for each slide reports what a
 * migrator needs to know before touching it:
 *   - index, old layout, title, whether it has speaker notes
 *   - which components it uses (all PascalCase tags; the ones you pass via --old
 *     are highlighted as "to migrate", --customs ones flagged as last-resort ports)
 *   - raw-HTML / inline-style / hardcoded-hex signals it carries
 *   - a naive suggested NEW layout (generic old->toolkit heuristics)
 *
 * This is the OLD-side companion to `npm run verify` (which guards the NEW side).
 * It changes no content — it only writes a per-chapter checklist you tick off.
 *
 * Repo-agnostic: nothing here is specific to one deck. Point --old/--customs at
 * the source deck's own component names (the enumerator lists every component it
 * sees, so a first dry run tells you what to pass).
 *
 * Usage (run from inside the deck, so @slidev/parser resolves):
 *   node enumerate-slides.mjs <old-chapter.md> [--old A,B] [--customs C,D] [--json] [--out <file>]
 *
 * Default output: <cwd>/.context/migration/checklists/<chapter-basename>.md
 */
import { readFileSync, mkdirSync, writeFileSync } from 'node:fs'
import { basename, join, resolve } from 'node:path'

const args = process.argv.slice(2)
const emitJson = args.includes('--json')
const flagVal = (name) => {
  const i = args.indexOf(name)
  return i !== -1 ? args[i + 1] : null
}
const list = (name) => (flagVal(name) ? flagVal(name).split(',').map((s) => s.trim()).filter(Boolean) : [])
const OLD = new Set(list('--old'))
const CUSTOMS = new Set(list('--customs'))
const explicitOut = flagVal('--out')
const flagValues = new Set(['--old', '--customs', '--out'].map(flagVal).filter(Boolean))
const input = args.find((a) => !a.startsWith('--') && !flagValues.has(a))

if (!input) {
  console.error('usage: node enumerate-slides.mjs <old-chapter.md> [--old A,B] [--customs C,D] [--json] [--out <file>]')
  process.exit(1)
}

// Generic old-layout -> suggested toolkit layout (heuristic priors, not gospel).
const LAYOUT_SUGGEST = {
  intro: 'cover (deck) / section (chapter divider)',
  section: 'section',
  'new-section': 'section',
  breaker: 'section / hero',
  default: 'content',
  'two-cols': 'content-image / SplitView-in-content',
  'two-cols-header': 'content (+ CardGrid/SplitView)',
  hero: 'hero',
  fact: 'hero',
  quote: 'hero (with attribution)',
  exercise: 'content + CardGrid (custom only if it fails)',
  lab: 'content / default',
}

// Universal raw-HTML / non-markdown signals (no brand-specific tokens).
const RAW_HTML_SIGNALS = [
  [/<div[\s/>]/, 'div'], [/<svg[\s/>]/, 'inline-svg'], [/<span[\s/>]/, 'span'],
  [/<p[\s/>]/, 'p-tag'], [/<br[\s/>]/, 'br'], [/<table[\s/>]/, 'table'],
  [/style=/, 'inline-style'], [/class=/, 'utility-class'],
  [/var\(--/, 'css-var'], [/#[0-9a-fA-F]{3,6}\b/, 'hardcoded-hex'],
]

function detect(content) {
  const components = [...new Set([...content.matchAll(/<([A-Z][A-Za-z0-9]*)[\s/>]/g)].map((m) => m[1]))]
  const raw = RAW_HTML_SIGNALS.filter(([re]) => re.test(content)).map(([, label]) => label)
  return { components, raw: [...new Set(raw)] }
}

function firstHeading(content) {
  const m = content.match(/^#{1,3}\s+(.+)$/m)
  return m ? m[1].replace(/\*\*/g, '').trim() : ''
}

const filepath = resolve(input)
const source = readFileSync(filepath, 'utf8')
const { parseSync } = await import('@slidev/parser')
const slides = parseSync(source, filepath).slides ?? []

const rows = slides.map((s, i) => {
  const content = s.content ?? ''
  const layout = s.frontmatter?.layout ?? (i === 0 ? '(headmatter/none)' : 'default')
  const { components, raw } = detect(content)
  return {
    n: i + 1,
    layout,
    suggest: LAYOUT_SUGGEST[layout] ?? '?',
    title: s.title || firstHeading(content),
    hasNote: !!(s.note && s.note.trim()),
    components,
    old: components.filter((c) => OLD.has(c)),
    customs: components.filter((c) => CUSTOMS.has(c)),
    raw,
    isSrcImport: !!s.frontmatter?.src,
  }
})

const chapter = basename(filepath).replace(/\.md$/, '')
const hard = rows.filter((r) => r.raw.length || r.customs.length)
const lines = [
  `# Migration checklist — ${chapter}`,
  '',
  `Source: \`${filepath}\``,
  `Slides: **${rows.length}** · with raw-HTML/custom to resolve: **${hard.length}**`,
  '',
  'Status legend: `[ ]` todo · `[~]` wip · `[x]` migrated + verify green',
  '',
]
for (const r of rows) {
  if (r.isSrcImport) continue
  lines.push(`## [ ] Slide ${r.n} — ${r.title || '(untitled)'}`)
  lines.push(`- old layout: \`${r.layout}\` → suggest: **${r.suggest}**`)
  if (r.components.length) lines.push(`- components: ${r.components.map((c) => `\`${c}\``).join(', ')}`)
  if (r.customs.length) lines.push(`- ⚠ last-resort custom: ${r.customs.map((c) => `\`${c}\``).join(', ')} (port only if no toolkit equivalent)`)
  if (r.raw.length) lines.push(`- ⚠ raw signals: ${r.raw.map((c) => `\`${c}\``).join(', ')}`)
  lines.push(`- speaker notes: ${r.hasNote ? 'yes (keep; source language ok)' : 'none'}`)
  lines.push('')
}

const outPath = explicitOut
  ? resolve(explicitOut)
  : join(process.cwd(), '.context', 'migration', 'checklists', `${chapter}.md`)
mkdirSync(join(outPath, '..'), { recursive: true })
writeFileSync(outPath, lines.join('\n'), 'utf8')
console.log(`Wrote checklist: ${outPath} (${rows.length} slides)`)

if (emitJson) {
  const jsonPath = outPath.replace(/\.md$/, '.json')
  writeFileSync(jsonPath, JSON.stringify({ chapter, filepath, slides: rows }, null, 2), 'utf8')
  console.log(`Wrote JSON: ${jsonPath}`)
}
