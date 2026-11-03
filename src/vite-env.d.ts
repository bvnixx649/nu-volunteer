/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** 'supabase' uses the Supabase project in src/data/supabase.ts; unset uses the browser-only local store. */
  readonly VITE_DATA?: 'supabase'
}
