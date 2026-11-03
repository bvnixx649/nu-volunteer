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

// `--remote` runs against the real Supabase project (VITE_DATA=supabase); `npm run e2e:remote` seeds it first.
const remote = process.argv.includes('--remote') || process.env.VITE_DATA === 'supabase'
if (remote) process.env.VITE_DATA = 'supabase'
const only = process.argv.slice(2).find((a) => !a.startsWith('--'))
const specs = readdirSync(here).filter((f) => f.endsWith('.mjs') && f !== 'run.mjs' && (!only || f.startsWith(only)))
const mode = remote ? 'remote' : 'local'

const server = await createServer({ root: join(here, '../..'), server: { port: 5199, strictPort: true, fs: { allow: [join(here, '../..'), ...(process.env.E2E_FS_ALLOW ? [process.env.E2E_FS_ALLOW] : [])] } }, logLevel: 'error' })
await server.listen()
const base = 'http://localhost:5199/nu-volunteer/'
const browser = await chromium.launch()
if (remote) {
  // Every context is a fresh phone; start each already signed in with one shared anonymous session.
  const { config, signedInClient, storageEntry } = await import('../lib/remote-db.mjs')
  const cfg = await config()
  const { key, value } = storageEntry(cfg.url, (await signedInClient(cfg)).session)
  const newContext = browser.newContext.bind(browser)
  browser.newContext = async (opts) => {
    const ctx = await newContext(opts)
    await ctx.addInitScript(([k, v]) => {
      try {
        if (!localStorage.getItem(k)) localStorage.setItem(k, v)
      } catch {}
    }, [key, value])
    return ctx
  }
}
// Lets specs use app code (e.g. makeToken) through Vite's TS pipeline.
const load = (path) => server.ssrLoadModule(path)
// Every screenshot is also a copy check: words the app no longer uses must not show on any screen a spec visits.
const BANNED = ['ผู้คุม', 'แอพ', 'walk-in', 'Walk-in', 'ลงชื่อ', '·', '—']
const shot = async (page, name) => {
  const text = await page.evaluate(() => document.body.innerText).catch(() => '')
  const hit = BANNED.find((w) => text.includes(w))
  if (hit) throw new Error(`screen "${name}" shows "${hit}"`)
  return page.screenshot({ path: join(out, `${name}.png`), fullPage: !name.startsWith('stress-roster') })
}

let failed = 0
for (const f of specs) {
  const t0 = Date.now()
  try {
    const spec = await import(pathToFileURL(join(here, f)).href)
    if (spec.localOnly && remote) {
      console.log(`SKIP ${f} (local only: ${spec.localOnly})`)
      continue
    }
    // Each local spec starts from a fresh fixture in its own browser storage; the shared database needs the same.
    if (remote) await (await import('../lib/seed.mjs')).seedTestData()
    await spec.default({ browser, base, load, shot, mode })
    console.log(`PASS ${f} (${Date.now() - t0} ms)`)
  } catch (e) {
    failed++
    console.log(`FAIL ${f}: ${e.message}`)
  }
}
await browser.close()
await server.close()
process.exit(failed ? 1 : 0)
