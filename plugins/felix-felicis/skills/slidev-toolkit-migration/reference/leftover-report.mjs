#!/usr/bin/env node
/**
 * "What's left" migration report. Scans migrated slide files and flags the two
 * things a migration to the Miragon toolkit must drive to zero:
 *
 *   1. Raw HTML in slide bodies (`<div>`, `<span>`, `<style>`, `<br>`, …) — the
 *      toolkit wants frontmatter + headings + bullets + component tags only.
 *   2. References to OLD design-system components you are migrating away from
 *      (pass their PascalCase tag names via --old), so you can see which slides
 *      still lean on the source theme instead of toolkit components.
 *
 * Tag detection mirrors the template's own `verify/rules/no-raw-html.ts` exactly,
 * so it produces the same verdict and no false positives: PascalCase tags
 * (`<Card>`, `<Figure>`, …) are components, `v-*` directives (`<v-clicks>`) and a
 * small Vue/Slidev built-in allowlist (`<template>`, `<slot>`, …) are allowed, and
 * fenced code / inline code / speaker-note comments are blanked out (line numbers
 * preserved) so examples don't false-positive. This is line-level tag detection,
 * not slide-boundary logic, so it needs no parser — unlike enumerate-slides.mjs,
 * which uses @slidev/parser for genuine slide splitting.
 *
 * Usage (run from the deck; pass a glob via your shell):
 *   node leftover-report.mjs deck/chapter/03-theme/03-theme.md --old AlertBox,ExerciseCard
 *
 * Exit code is non-zero while anything is outstanding, so it doubles as a pre-PR gate.
 */
import { readFileSync } from 'node:fs'

const args = process.argv.slice(2)
const oldFlagIdx = args.indexOf('--old')
const oldTags = new Set(
  oldFlagIdx >= 0 && args[oldFlagIdx + 1]
    ? args[oldFlagIdx + 1].split(',').map((s) => s.trim()).filter(Boolean)
    : [],
)
const files = args.filter((a, i) => !a.startsWith('--') && !(oldFlagIdx >= 0 && i === oldFlagIdx + 1))

if (files.length === 0) {
  console.error('usage: node leftover-report.mjs <file.md> [more.md ...] [--old Tag1,Tag2]')
  process.exit(1)
}

/** Vue/Slidev built-ins that are allowed even though lowercase (from the template rule). */
const ALLOWED = new Set(['template', 'component', 'slot', 'transition', 'transition-group', 'keep-alive', 'teleport', 'suspense'])

/** A real tag: `<` (opt `/`) + name, followed by whitespace, `/` or `>` (rejects `<https://…>`). */
const TAG = /<\/?([A-Za-z][A-Za-z0-9-]*)(?=[\s/>])/g

/** Blank a matched region, keeping newlines so line numbers stay true. */
const blank = (text, re) => text.replace(re, (m) => m.replace(/[^\n]/g, ' '))

let outstanding = 0
for (const file of files) {
  let src = readFileSync(file, 'utf8')
  src = blank(src, /```[\s\S]*?```/g) // fenced code blocks
  src = blank(src, /<!--[\s\S]*?-->/g) // HTML comments (speaker notes)
  src = blank(src, /`[^`\n]*`/g) // inline code spans

  src.split('\n').forEach((line, i) => {
    TAG.lastIndex = 0
    let m
    while ((m = TAG.exec(line))) {
      const tag = m[1]
      if (oldTags.has(tag)) {
        outstanding++
        console.log(`${file}:${i + 1}  old component <${tag}>  →  ${line.trim()}`)
        continue
      }
      // Same skip logic as the template's no-raw-html rule.
      if (/^[A-Z]/.test(tag) || tag.startsWith('v-') || ALLOWED.has(tag)) continue
      outstanding++
      console.log(`${file}:${i + 1}  raw html <${tag}>  →  ${line.trim()}`)
    }
  })
}

console.log(
  outstanding === 0
    ? '\n✓ clean — no raw HTML and no old components left'
    : `\n✗ ${outstanding} leftover(s) still to migrate`,
)
process.exit(outstanding === 0 ? 0 : 1)
