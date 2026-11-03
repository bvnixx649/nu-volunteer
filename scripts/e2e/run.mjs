// Runs every e2e spec against a Vite dev server: `npm run e2e` or `npm run e2e -- claim`.
// Each spec exports default async ({ browser, base, load, shot }) and throws on failure.
import { createServer } from 'vite'
import { chromium } from 'playwright'
import { mkdirSync, readdirSync } from 'node:fs'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { dirname, join } from 'node:path'

const here = dirname(fileURLToPath(import.meta.url))
const out = join(here, 'out')
mkdirSync(out, { recursive: true })

const only = process.argv[2]
const specs = readdirSync(here).filter((f) => f.endsWith('.mjs') && f !== 'run.mjs' && (!only || f.startsWith(only)))

const server = await createServer({ root: join(here, '../..'), server: { port: 5199, strictPort: true }, logLevel: 'error' })
await server.listen()
const base = 'http://localhost:5199/nu-volunteer/'
const browser = await chromium.launch()
// Lets specs use app code (e.g. makeToken) through Vite's TS pipeline.
const load = (path) => server.ssrLoadModule(path)
const shot = (page, name) => page.screenshot({ path: join(out, `${name}.png`), fullPage: !name.startsWith('stress-roster') })

let failed = 0
for (const f of specs) {
  const t0 = Date.now()
  try {
    const spec = await import(pathToFileURL(join(here, f)).href)
    await spec.default({ browser, base, load, shot })
    console.log(`PASS ${f} (${Date.now() - t0} ms)`)
  } catch (e) {
    failed++
    console.log(`FAIL ${f}: ${e.message}`)
  }
}
await browser.close()
await server.close()
process.exit(failed ? 1 : 0)
