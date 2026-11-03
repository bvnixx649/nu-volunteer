import type { Api, ClaimInput, ClaimResult, Unsub } from './api'
import { fromActivityPatch, fromStudent, toActivity, toCredit, toOrg, toRegistration, toStudent } from './rows'
import { ready, supabase } from './supabase'

/**
 * Supabase implementation of Api. Reads are plain selects; writes where two people can collide go
 * through Postgres functions (supabase/schema.sql) so each one is atomic. Everything waits for the
 * anonymous sign-in first.
 */

/** Realtime events arrive in bursts (a queue scanning at once); one refetch covers a burst. */
const REFRESH_MS = 200

let serverOffset = 0
let channelSeq = 0

/** Fetch failures carry no Postgres error code; those mean the network, not the database. */
const isNetwork = (e: { code?: string }) => !e.code

async function must<T>(p: PromiseLike<{ data: T; error: { message: string } | null }>): Promise<T> {
  await ready
  const { data, error } = await p
  if (error) throw new Error(error.message)
  return data
}

async function rpc<T>(fn: string, args?: Record<string, unknown>): Promise<T> {
  await ready
  const { data, error } = await supabase.rpc(fn, args)
  if (error) throw new Error(error.message)
  return data as T
}

/** Calls load() now and after each change on the table, handing the full current value to cb. */
function watchTable<T>(table: string, filter: string | undefined, load: () => Promise<T>, cb: (v: T) => void): Unsub {
  let stopped = false
  let timer: ReturnType<typeof setTimeout> | undefined
  let seq = 0
  let channel: ReturnType<typeof supabase.channel> | null = null

  const refresh = async () => {
    const mine = ++seq
    try {
      const v = await load()
      if (!stopped && mine === seq) cb(v)
    } catch (e) {
      console.warn(`watch ${table} failed`, e)
    }
  }
  const soon = () => {
    clearTimeout(timer)
    timer = setTimeout(refresh, REFRESH_MS)
  }

  ready.then(() => {
    if (stopped) return
    channel = supabase
      .channel(`${table}:${filter ?? 'all'}:${++channelSeq}`)
      .on('postgres_changes', { event: '*', schema: 'public', table, ...(filter && { filter }) }, soon)
      // Events during a disconnect are lost, so reload whenever the channel (re)joins.
      .subscribe((status) => status === 'SUBSCRIBED' && refresh())
    refresh()
  })

  return () => {
    stopped = true
    clearTimeout(timer)
    if (channel) supabase.removeChannel(channel)
  }
}

export function createRemoteApi(): Api {
  const t0 = Date.now()
  rpc<number>('server_now')
    .then((s) => (serverOffset = Number(s) - (t0 + Date.now()) / 2))
    .catch(() => {})

  const activity = async (id: string) => {
    const row = await must(supabase.from('activities').select('*').eq('id', id).maybeSingle())
    return row ? toActivity(row) : null
  }
  const registrations = async (a: string) =>
    ((await must(supabase.from('registrations').select('*').eq('activity_id', a).order('at', { ascending: false }))) ?? []).map(toRegistration)
  const credits = async (a: string) =>
    ((await must(supabase.from('credits').select('*').eq('activity_id', a).order('at', { ascending: false }))) ?? []).map(toCredit)

  return {
    serverOffset: () => serverOffset,

    async getStudent(id) {
      const row = await must(supabase.from('students').select('*').eq('id', id).maybeSingle())
      return row ? toStudent(row) : null
    },
    async createStudent(s) {
      await must(supabase.from('students').upsert(fromStudent(s), { onConflict: 'id', ignoreDuplicates: true }))
    },
    async getOrg(code) {
      const rows = await rpc<unknown[]>('get_org', { p_code: code })
      return rows?.[0] ? toOrg(rows[0]) : null
    },
    getActivity: activity,
    async getCredit(a, s) {
      const row = await must(supabase.from('credits').select('*').eq('activity_id', a).eq('student_id', s).maybeSingle())
      return row ? toCredit(row) : null
    },
    async getRegistration(a, s) {
      const row = await must(supabase.from('registrations').select('*').eq('activity_id', a).eq('student_id', s).maybeSingle())
      return row ? toRegistration(row) : null
    },

    watchActivities: (cb) =>
      watchTable('activities', undefined, async () => ((await must(supabase.from('activities').select('*'))) ?? []).map(toActivity), cb),
    watchActivity: (id, cb) => watchTable('activities', `id=eq.${id}`, () => activity(id), cb),
    watchRegistrations: (a, cb) => watchTable('registrations', `activity_id=eq.${a}`, () => registrations(a), cb),
    watchCredits: (a, cb) => watchTable('credits', `activity_id=eq.${a}`, () => credits(a), cb),

    async claim(input: ClaimInput): Promise<ClaimResult> {
      if (!navigator.onLine) return { ok: false, reason: 'offline' }
      await ready
      const { data, error } = await supabase.rpc('claim', {
        p_activity: input.activityId,
        p_student: input.student.id,
        p_name: input.student.name,
        p_hours: input.hours,
        p_method: input.method,
        p_flags: input.flags,
        p_distance: input.distance ?? null,
        p_accuracy: input.accuracy ?? null,
        p_device: input.deviceId || null,
        p_ref: input.ref || null,
        p_by: input.by || null,
      })
      if (error) {
        if (isNetwork(error)) return { ok: false, reason: 'offline' }
        throw new Error(error.message)
      }
      const credit = toCredit(data.credit)
      return data.ok ? { ok: true, credit } : { ok: false, reason: 'already', credit }
    },

    async setHours(a, s, hours, reason, by) {
      await rpc('set_hours', { p_activity: a, p_student: s, p_hours: hours, p_reason: reason, p_by: by })
    },
    async removeCredit(a, s) {
      await rpc('remove_credit', { p_activity: a, p_student: s })
    },
    async removeRegistration(a, s) {
      await rpc('remove_registration', { p_activity: a, p_student: s })
    },
    async closeRoster(a) {
      await rpc('close_roster', { p_activity: a })
    },
    async updateActivity(id, patch) {
      const row = fromActivityPatch(patch)
      if (Object.keys(row).length) await must(supabase.from('activities').update(row).eq('id', id))
    },
    async submitRoster(a) {
      await rpc('submit_roster', { p_activity: a })
    },
  }
}
