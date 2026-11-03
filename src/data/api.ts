import type { Activity, Credit, CreditFlag, Org, Registration, Student } from './types'
import { createLocalApi, seedIfEmpty } from './local'
import { FIXTURE } from './fixture'

export type Unsub = () => void

export type ClaimInput = {
  activityId: string
  student: { id: string; name: string }
  hours: number
  method: 'qr' | 'manual'
  flags: CreditFlag[]
  distance?: number
  accuracy?: number
  deviceId?: string
  ref?: string
  /** Supervisor name when they add someone by hand. */
  by?: string
}

export type ClaimResult = { ok: true; credit: Credit } | { ok: false; reason: 'already' | 'offline'; credit?: Credit }

/**
 * Everything the screens need from storage. Screens never touch a database directly,
 * so swapping this for Supabase (or anything else) means writing one more implementation.
 */
export interface Api {
  /** Milliseconds to add to Date.now() to get server time. */
  serverOffset(): number
  getStudent(id: string): Promise<Student | null>
  createStudent(s: Student): Promise<void>
  getOrg(code: string): Promise<Org | null>
  getActivity(id: string): Promise<Activity | null>
  getCredit(activityId: string, studentId: string): Promise<Credit | null>
  getRegistration(activityId: string, studentId: string): Promise<Registration | null>
  watchActivities(cb: (a: Activity[]) => void): Unsub
  watchActivity(id: string, cb: (a: Activity | null) => void): Unsub
  watchRegistrations(activityId: string, cb: (r: Registration[]) => void): Unsub
  watchCredits(activityId: string, cb: (c: Credit[]) => void): Unsub
  /** Writes the credit only if none exists, bumps creditCount, and registers walk-ins. All or nothing. */
  claim(input: ClaimInput): Promise<ClaimResult>
  setHours(activityId: string, studentId: string, hours: number, reason: string, by: string): Promise<void>
  removeCredit(activityId: string, studentId: string): Promise<void>
  /** Deletes the registration and its credit, if any, and lowers regCount and creditCount (never below 0). All or nothing. */
  removeRegistration(activityId: string, studentId: string): Promise<void>
  /** Sets closedAt to server time unless it is already set. */
  closeRoster(activityId: string): Promise<void>
  /** Changes the check-in settings. The caller checks canEdit; settings of a sent roster should not change. */
  updateActivity(id: string, patch: Partial<Pick<Activity, 'qrMode' | 'qrInterval' | 'locMode' | 'radius'>>): Promise<void>
  /** Sets submittedAt unless already set, and closedAt too if the roster was still open. */
  submitRoster(activityId: string): Promise<void>
}

/**
 * The Supabase client is loaded on demand so the local build never ships it. Promise methods wait for
 * the module; watchers subscribe once it arrives and can be cancelled before that.
 */
function lazyRemote(): Api {
  let impl: Api | null = null
  const loading = import('./remote').then((m) => (impl = m.createRemoteApi()))
  const call =
    <K extends keyof Api>(k: K) =>
    async (...args: unknown[]) =>
      ((await loading)[k] as (...a: unknown[]) => unknown)(...args)
  const watch =
    <K extends 'watchActivities' | 'watchActivity' | 'watchRegistrations' | 'watchCredits'>(k: K) =>
    (...args: unknown[]): Unsub => {
      let stop: Unsub | null = null
      let cancelled = false
      loading.then((a) => {
        if (!cancelled) stop = (a[k] as (...x: unknown[]) => Unsub)(...args)
      })
      return () => {
        cancelled = true
        stop?.()
      }
    }
  return {
    serverOffset: () => impl?.serverOffset() ?? 0,
    getStudent: call('getStudent'),
    createStudent: call('createStudent'),
    getOrg: call('getOrg'),
    getActivity: call('getActivity'),
    getCredit: call('getCredit'),
    getRegistration: call('getRegistration'),
    claim: call('claim'),
    setHours: call('setHours'),
    removeCredit: call('removeCredit'),
    removeRegistration: call('removeRegistration'),
    closeRoster: call('closeRoster'),
    updateActivity: call('updateActivity'),
    submitRoster: call('submitRoster'),
    watchActivities: watch('watchActivities'),
    watchActivity: watch('watchActivity'),
    watchRegistrations: watch('watchRegistrations'),
    watchCredits: watch('watchCredits'),
  } as Api
}

// VITE_DATA is fixed at build time, so the unused branch (and its imports) is dropped from the bundle.
const useSupabase = import.meta.env.VITE_DATA === 'supabase'

if (import.meta.env.DEV && !useSupabase) seedIfEmpty(FIXTURE())

export const api: Api = useSupabase ? lazyRemote() : createLocalApi()

/** Server time now. */
export const now = () => Date.now() + api.serverOffset()
