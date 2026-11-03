import { createClient } from '@supabase/supabase-js'

// Paste the Project URL and anon key from the Supabase dashboard, Settings > API. Both are public; never the service_role key.
export const SUPABASE_URL = 'https://khavsmhheuabbkoybknm.supabase.co'
export const SUPABASE_ANON_KEY = 'sb_publishable_fwzsGRELcgZv6LboOYp1wg_WTv7-AZB'

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.error('VITE_DATA=supabase but SUPABASE_URL or SUPABASE_ANON_KEY in src/data/supabase.ts is empty')
}

// Placeholders keep createClient from throwing, so the error above is the one that shows.
export const supabase = createClient(SUPABASE_URL || 'http://localhost', SUPABASE_ANON_KEY || 'missing')

/** Resolves once this device has a session; every API call waits for it. Anonymous accounts carry no identity, student ids live in the data. */
export const ready: Promise<void> = (async () => {
  const { data } = await supabase.auth.getSession()
  if (data.session) return
  const { error } = await supabase.auth.signInAnonymously()
  if (error) console.error('Anonymous sign-in failed. Is Anonymous sign-ins on in Authentication settings?', error.message)
})()
