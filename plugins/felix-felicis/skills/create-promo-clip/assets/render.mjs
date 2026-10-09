import { spawn } from 'node:child_process'
import { createReadStream } from 'node:fs'
import { mkdir, readdir } from 'node:fs/promises'
import { createServer } from 'node:http'
import { extname, join, normalize } from 'node:path'
import { fileURLToPath } from 'node:url'
import ffmpegInstaller from '@ffmpeg-installer/ffmpeg'
import { chromium } from 'playwright'
import { findLayoutProblems } from './layout-check.mjs'

const FRAMES_PER_SECOND = 30
const CANVAS = { width: 1080, height: 1080 }
const MIME_TYPES = {
  '.html': 'text/html',
  '.css': 'text/css',
  '.js': 'text/javascript',
  '.svg': 'image/svg+xml',
  '.woff2': 'font/woff2',
}

const clipDirectory = fileURLToPath(new URL('.', import.meta.url))
const outputDirectory = join(clipDirectory, 'out')
const gifDirectory = join(clipDirectory, 'gifs')
const GIF_FILTER = 'fps=10,scale=720:-1:flags=lanczos'
const requestedVariants = process.argv.slice(2).filter((argument) => !argument.startsWith('--'))
const variants = requestedVariants.length > 0 ? requestedVariants : await readdir(join(clipDirectory, 'variants'))
const previewOnly = process.argv.includes('--preview')
const checkOnly = process.argv.includes('--check')
const gifOnly = process.argv.includes('--gif')

function serveClipDirectory() {
  const server = createServer((request, response) => {
    const path = normalize(decodeURIComponent(new URL(request.url, 'http://localhost').pathname))
    response.setHeader('Content-Type', MIME_TYPES[extname(path)] ?? 'application/octet-stream')
    createReadStream(join(clipDirectory, path))
      .on('error', () => response.writeHead(404).end())
      .pipe(response)
  })
  return new Promise((resolve) => server.listen(0, '127.0.0.1', () => resolve(server)))
}

function startEncoder(outputFile) {
  const encoder = spawn(ffmpegInstaller.path, [
    '-y', '-loglevel', 'error',
    '-f', 'image2pipe', '-framerate', String(FRAMES_PER_SECOND), '-i', '-',
    '-c:v', 'libx264', '-preset', 'slow', '-crf', '18', '-pix_fmt', 'yuv420p',
    '-movflags', '+faststart',
    outputFile,
  ], { stdio: ['pipe', 'inherit', 'inherit'] })
  const finished = new Promise((resolve, reject) => {
    encoder.on('close', (code) => (code === 0 ? resolve() : reject(new Error(`ffmpeg exited with ${code}`))))
  })
  return { encoder, finished }
}

async function openClip(browser, variant) {
  const page = await browser.newPage({ viewport: CANVAS })
  await page.goto(variantUrl(variant))
  await page.evaluate(() => document.fonts.ready)
  await page.waitForFunction(() => window.clipReady !== false && window.clipSeconds > 0)
  return page
}

async function renderClip(browser, variant) {
  const outputFile = join(outputDirectory, `${variant}.mp4`)
  const page = await openClip(browser, variant)
  const clipSeconds = await page.evaluate(() => window.clipSeconds)
  const frameCount = Math.round(clipSeconds * FRAMES_PER_SECOND)
  const { encoder, finished } = startEncoder(outputFile)

  for (let frame = 0; frame < frameCount; frame++) {
    await page.evaluate((second) => window.seek(second), frame / FRAMES_PER_SECOND)
    const screenshot = await page.screenshot({ type: 'png' })
    if (!encoder.stdin.write(screenshot)) {
      await new Promise((resolve) => encoder.stdin.once('drain', resolve))
    }
  }

  encoder.stdin.end()
  await finished
  await page.close()
  console.log(`${outputFile} (${frameCount} frames, ${clipSeconds}s)`)
}

async function checkClip(browser, variant) {
  const page = await openClip(browser, variant)
  const problems = await findLayoutProblems(page)
  await page.close()
  console.log(variant, problems.length > 0 ? problems : 'no layout problems found')
  return problems.length
}

function runFfmpeg(args) {
  return new Promise((resolve, reject) => {
    spawn(ffmpegInstaller.path, ['-y', '-loglevel', 'error', ...args], { stdio: 'inherit' })
      .on('close', (code) => (code === 0 ? resolve() : reject(new Error(`ffmpeg exited with ${code}`))))
  })
}

async function convertToGif(variant) {
  const clip = join(outputDirectory, `${variant}.mp4`)
  const palette = join(outputDirectory, `${variant}-palette.png`)
  const gif = join(gifDirectory, `${variant}.gif`)
  await runFfmpeg(['-i', clip, '-vf', `${GIF_FILTER},palettegen=max_colors=128:stats_mode=diff`, palette])
  await runFfmpeg([
    '-i', clip, '-i', palette,
    '-lavfi', `${GIF_FILTER}[frames];[frames][1:v]paletteuse=dither=none:diff_mode=rectangle`,
    '-loop', '0', gif,
  ])
  console.log(gif)
}

const server = await serveClipDirectory()
const variantUrl = (variant) => `http://127.0.0.1:${server.address().port}/variants/${variant}/index.html`

if (previewOnly) {
  variants.forEach((variant) => console.log(`Preview: ${variantUrl(variant)}`))
} else if (gifOnly) {
  await mkdir(gifDirectory, { recursive: true })
  for (const variant of variants) {
    await convertToGif(variant)
  }
  server.close()
} else if (checkOnly) {
  const browser = await chromium.launch()
  let problemCount = 0
  for (const variant of variants) {
    problemCount += await checkClip(browser, variant)
  }
  await browser.close()
  server.close()
  process.exitCode = problemCount > 0 ? 1 : 0
} else {
  await mkdir(outputDirectory, { recursive: true })
  const browser = await chromium.launch()
  for (const variant of variants) {
    await renderClip(browser, variant)
  }
  await browser.close()
  server.close()
}
