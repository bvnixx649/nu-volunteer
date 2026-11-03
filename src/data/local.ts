import type { Api, ClaimInput, ClaimResult } from './api'
import type { Activity, Credit, Org, Registration, Student } from './types'

/**
 * Browser-only storage for building and demoing without a backend: one JSON blob in localStorage,
 * changes broadcast to other tabs. It does not reach other devices; that is what the Firestore
 * implementation is for.
 */

export interface LocalDb {
  students: Record<string, Student>
  orgs: Record<string, Org>
  activities: Record<string, Activity>
  regs: Record<string, Record<string, Registration>>
  credits: Record<string, Record<string, Credit>>
}

const KEY = 'nuv:db'
const empty = (): LocalDb => ({ students: {}, orgs: {}, activities: {}, regs: {}, credits: {} })

const load = (): LocalDb => {
  try {
    return { ...empty(), ...JSON.parse(localStorage.getItem(KEY) ?? '{}') }
  } catch {
    return empty()
  }
}

const listeners = new Set<() => void>()
const notify = () => listeners.forEach((l) => l())
const channel = typeof BroadcastChannel !== 'undefined' ? new BroadcastChannel('nuv') : null
channel?.addEventListener('message', notify)

const save = (db: LocalDb) => {
  localStorage.setItem(KEY, JSON.stringify(db))
  channel?.postMessage('changed')
  notify()
}

/** Replaces the whole store. For tests and the dev fixture. */
export function resetLocal(db: Partial<LocalDb> = {}) {
  save({ ...empty(), ...db })
}

export function seedIfEmpty(db: Partial<LocalDb>) {
  if (localStorage.getItem(KEY) === null) resetLocal(db)
}

type LockNav = Navigator & { locks?: { request: <T>(name: string, fn: () => T | Promise<T>) => Promise<T> } }

/** Read, change and save as one step. The Web Locks API keeps two tabs from interleaving. */
async function tx<T>(fn: (db: LocalDb) => T): Promise<T> {
  const run = () => {
    const db = load()
    const out = fn(db)
    save(db)
    return out
  }
  const locks = (navigator as LockNav).locks
  return locks ? locks.request('nuv-db', run) : run()
}

function watch<T>(select: (db: LocalDb) => T, cb: (v: T) => void) {
  const fire = () => cb(select(load()))
  listeners.add(fire)
  queueMicrotask(fire)
  return () => {
    listeners.delete(fire)
  }
}

const byTimeDesc = <T extends { at: number }>(xs: T[]) => xs.sort((a, b) => b.at - a.at)

export function createLocalApi(): Api {
  return {
    serverOffset: () => 0,

    getStudent: async (id) => load().students[id] ?? null,
    createStudent: (s) =>
      tx((db) => {
        db.students[s.id] ??= s
      }),
    getOrg: async (code) => load().orgs[code] ?? null,
    getActivity: async (id) => load().activities[id] ?? null,
    getCredit: async (a, s) => load().credits[a]?.[s] ?? null,
    getRegistration: async (a, s) => load().regs[a]?.[s] ?? null,

    watchActivities: (cb) => watch((db) => Object.values(db.activities), cb),
    watchActivity: (id, cb) => watch((db) => db.activities[id] ?? null, cb),
    watchRegistrations: (a, cb) => watch((db) => byTimeDesc(Object.values(db.regs[a] ?? {})), cb),
    watchCredits: (a, cb) => watch((db) => byTimeDesc(Object.values(db.credits[a] ?? {})), cb),

    async claim(input: ClaimInput): Promise<ClaimResult> {
      if (!navigator.onLine) return { ok: false, reason: 'offline' }
      return tx((db): ClaimResult => {
        const activity = db.activities[input.activityId]
        const credits = (db.credits[input.activityId] ??= {})
        const regs = (db.regs[input.activityId] ??= {})
        const { id, name } = input.student
        if (credits[id]) return { ok: false, reason: 'already', credit: credits[id] }

        const at = Date.now()
        const credit: Credit = {
          studentId: id,
          name,
          hours: input.hours,
          fullHours: activity?.hours ?? input.hours,
          at,
          method: input.method,
          flags: [...input.flags],
          ...(input.distance !== undefined && { distance: input.distance }),
          ...(input.accuracy !== undefined && { accuracy: input.accuracy }),
          ...(input.deviceId && { deviceId: input.deviceId }),
          ...(input.ref && { ref: input.ref }),
          ...(input.by && { editedBy: input.by }),
        }

        const sameDevice = input.deviceId ? Object.values(credits).filter((c) => c.deviceId === input.deviceId) : []
        if (sameDevice.length) {
          for (const c of [...sameDevice, credit]) if (!c.flags.includes('device')) c.flags.push('device')
        }
        credits[id] = credit
        if (activity) activity.creditCount = (activity.creditCount ?? 0) + 1

        const reg = regs[id]
        if (!reg || reg.cancelledAt) {
          regs[id] = { studentId: id, name, at, walkIn: true }
          if (activity) activity.regCount = (activity.regCount ?? 0) + 1
        }
        return { ok: true, credit }
      })
    },

    setHours: (a, s, hours, reason, by) =>
      tx((db) => {
        const c = db.credits[a]?.[s]
        if (!c) return
        Object.assign(c, { hours, reason, editedBy: by, editedAt: Date.now() })
      }),

    removeCredit: (a, s) =>
      tx((db) => {
        if (!db.credits[a]?.[s]) return
        delete db.credits[a][s]
        const act = db.activities[a]
        if (act) act.creditCount = Math.max(0, act.creditCount - 1)
      }),
  }
}
