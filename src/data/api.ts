import type {
  Activity,
  ActivityEdit,
  Announcement,
  ChatMsg,
  Credit,
  CreditFlag,
  DirectMsg,
  MyCredit,
  MyRegistration,
  NewActivity,
  Notice,
  NotifyPrefs,
  Org,
  Registration,
  Student,
} from './types'
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

export type RegisterResult = 'ok' | 'full' | 'already'

export type NewNotice = Pick<Notice, 'studentId' | 'kind' | 'title'> & Partial<Pick<Notice, 'body' | 'activityId' | 'to'>>

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
  /** Records how many bottles a credit was counted from (bottle exchange). Does not change hours. */
  setItems(activityId: string, studentId: string, items: number): Promise<void>
  removeCredit(activityId: string, studentId: string): Promise<void>
  /** Deletes the registration and its credit, if any, and lowers regCount and creditCount (never below 0). All or nothing. */
  removeRegistration(activityId: string, studentId: string): Promise<void>
  /** Sets closedAt to server time unless it is already set. */
  closeRoster(activityId: string): Promise<void>
  /** Creates an activity with a short random id, server time as createdAt and both counters at 0. Returns the id. */
  createActivity(a: NewActivity): Promise<string>
  /** Changes any field the editor offers. The caller checks canEdit; a sent roster should not change. A key set to undefined clears that optional field. */
  updateActivity(id: string, patch: ActivityEdit): Promise<void>
  // Student side. One-shot reads and single writes; none of it subscribes to realtime.
  /** Every activity, hidden ones included; the screen decides what to show. */
  listActivities(): Promise<Activity[]>
  /** Everyone credited in the activity, in the order they got it (oldest first). */
  listCredits(activityId: string): Promise<Credit[]>
  studentRegistrations(studentId: string): Promise<MyRegistration[]>
  studentCredits(studentId: string): Promise<MyCredit[]>
  /** Registers unless the activity is full or the student already is. A cancelled registration is reopened. */
  register(activityId: string, student: { id: string; name: string }): Promise<RegisterResult>
  /** Marks the registration cancelled and lowers regCount. `late` records that it cost a credit. */
  cancelRegistration(activityId: string, studentId: string, late: boolean): Promise<void>
  updateStudent(id: string, patch: { reminders?: string[]; notify?: NotifyPrefs }): Promise<void>
  /** Newest first, at most 60. */
  listNotices(studentId: string): Promise<Notice[]>
  addNotice(n: NewNotice): Promise<void>
  markNoticesRead(studentId: string): Promise<void>
  /** Newest first. */
  listAnnouncements(activityId: string): Promise<Announcement[]>
  /** Oldest first. */
  listMessages(activityId: string): Promise<ChatMsg[]>
  sendMessage(m: Omit<ChatMsg, 'id' | 'at'>): Promise<void>
  /** Oldest first. */
  listDms(activityId: string, studentId: string): Promise<DirectMsg[]>
  sendDm(m: Omit<DirectMsg, 'id' | 'at' | 'read'>): Promise<void>
  /** Marks the other side's messages in the thread as read. */
  markDmsRead(activityId: string, studentId: string, readerIsSup: boolean): Promise<void>
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
    setItems: call('setItems'),
    removeCredit: call('removeCredit'),
    removeRegistration: call('removeRegistration'),
    closeRoster: call('closeRoster'),
    createActivity: call('createActivity'),
    updateActivity: call('updateActivity'),
    submitRoster: call('submitRoster'),
    listActivities: call('listActivities'),
    listCredits: call('listCredits'),
    studentRegistrations: call('studentRegistrations'),
    studentCredits: call('studentCredits'),
    register: call('register'),
    cancelRegistration: call('cancelRegistration'),
    updateStudent: call('updateStudent'),
    listNotices: call('listNotices'),
    addNotice: call('addNotice'),
    markNoticesRead: call('markNoticesRead'),
    listAnnouncements: call('listAnnouncements'),
    listMessages: call('listMessages'),
    sendMessage: call('sendMessage'),
    listDms: call('listDms'),
    sendDm: call('sendDm'),
    markDmsRead: call('markDmsRead'),
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
