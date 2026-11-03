#!/usr/bin/env node
/**
 * screenshot-slide.mjs — screenshot a single rendered slide and probe its overflow.
 *
 * Two migration uses:
 *   1. Overflow debugging — prints whether the slide's content overflows the 16:9
 *      canvas (content scrollHeight vs canvas clientHeight), complementing the
 *      verify fit-check when you're tuning a dense slide.
 *   2. Image fallback — capture the ORIGINAL rendered slide/element from the source
 *      deck's dev server, to embed as a `<Figure src>` PNG when a visual can't be
 *      redrawn (see the visualisation decision tree in mapping-table.md).
 *
 * Resolves playwright from the CURRENT WORKING DIRECTORY, so it works in any deck
 * that has Playwright (the toolkit's verify/ ships it). Never starts or kills a
 * dev server — point it at one that's already running.
 *
 * Usage (from inside the deck):
 *   node screenshot-slide.mjs <url> <out.png>
 *   node screenshot-slide.mjs http://localhost:3030/12 /tmp/s12.png
 */
import { createRequire } from 'node:module'
import { join } from 'node:path'

const url = process.argv[2]
const out = process.argv[3] || '/tmp/slide.png'
if (!url) {
  console.error('usage: node screenshot-slide.mjs <url> <out.png>  (run from a deck with Playwright)')
  process.exit(1)
}

const require = createRequire(join(process.cwd(), 'package.json'))
let chromium
try {
  ;({ chromium } = require('playwright'))
} catch {
  ;({ chromium } = require('playwright-chromium'))
}

const browser = await chromium.launch()
try {
  const page = await browser.newPage({ viewport: { width: 1920, height: 1080 }, deviceScaleFactor: 1 })
  await page.goto(url, { waitUntil: 'networkidle', timeout: 30000 })
  await page.waitForSelector('#slide-content, .slidev-page', { timeout: 15000 })
  await page.waitForTimeout(1200)

  // Overflow probe: Slidev renders in a fixed-size canvas; if inner content is
  // taller than the canvas it clips (vertically-centred layouts hide top+bottom).
  const o = await page.evaluate(() => {
    const c = document.querySelector('#slide-content') || document.querySelector('.slidev-page')
    if (!c) return null
    return {
      cw: c.clientWidth, ch: c.clientHeight, sw: c.scrollWidth, sh: c.scrollHeight,
      ex_w: c.scrollWidth - c.clientWidth, ex_h: c.scrollHeight - c.clientHeight,
    }
  })

  await page.screenshot({ path: out })
  if (o) {
    const overflows = o.ex_h > 1 || o.ex_w > 1
    console.log(`[${overflows ? 'OVERFLOW' : 'ok'}] canvas=${o.cw}x${o.ch} content=${o.sw}x${o.sh} excess=${o.ex_w}x${o.ex_h}`)
  }
  console.log(`saved ${out}`)
} finally {
  await browser.close()
}
