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
 * so swapping this for Firestore (or anything else) means writing one more implementation.
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
}

if (import.meta.env.DEV) seedIfEmpty(FIXTURE())

export const api: Api = createLocalApi()

/** Server time now. */
export const now = () => Date.now() + api.serverOffset()
