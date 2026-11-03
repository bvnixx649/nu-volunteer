// Shared by seed-test.mjs and the e2e runner: one anonymous Supabase session, cached on disk, so a run does not
// spend one anonymous sign-in per script and per browser context (the project limits sign-ins per hour per IP).
import { createClient } from '@supabase/supabase-js'
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '../..')
const cache = join(root, 'scripts/e2e/out/.session.json')

/** URL and key from src/data/supabase.ts, the single place they live. Read as text: importing that module would sign in. */
export async function config() {
  const src = readFileSync(join(root, 'src/data/supabase.ts'), 'utf8')
  const url = src.match(/SUPABASE_URL\s*=\s*'([^']+)'/)?.[1]
  const key = src.match(/SUPABASE_ANON_KEY\s*=\s*'([^']+)'/)?.[1]
  if (!url || !key) throw new Error('SUPABASE_URL or SUPABASE_ANON_KEY not found in src/data/supabase.ts')
  return { url, key }
}

/** Returns a signed-in client and its session (reused from the cache while still valid). */
export async function signedInClient({ url, key }) {
  const db = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } })
  try {
    const saved = JSON.parse(readFileSync(cache, 'utf8'))
    if (saved.url === url) {
      const { data, error } = await db.auth.setSession({ access_token: saved.session.access_token, refresh_token: saved.session.refresh_token })
      if (!error && data.session) {
        saveSession(url, data.session)
        return { db, session: data.session }
      }
    }
  } catch {
    // no cache or it expired: sign in below
  }
  const { data, error } = await db.auth.signInAnonymously()
  if (error) throw error
  saveSession(url, data.session)
  return { db, session: data.session }
}

function saveSession(url, session) {
  mkdirSync(dirname(cache), { recursive: true })
  writeFileSync(cache, JSON.stringify({ url, session }))
}

/** The localStorage entry supabase-js reads on startup, so a fresh browser context starts already signed in. */
export const storageEntry = (url, session) => ({ key: `sb-${new URL(url).hostname.split('.')[0]}-auth-token`, value: JSON.stringify(session) })
