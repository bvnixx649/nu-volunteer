import { useSyncExternalStore } from 'react'
import { toast } from 'sonner'
import { api, now, type ClaimInput } from '../data/api'
import type { Credit } from '../data/types'

/**
 * Scans the phone kept because the network or the server was down (SPEC 5.2). The student sees a
 * "waiting to send" screen, never the success screen; the hours exist only once the server wrote the credit.
 */
export type Pending = {
  input: ClaimInput
  /** Server-offset-corrected ms at the moment of the scan. Sent as the credit time. */
  scannedAt: number
  /** The raw QR token, kept as proof of what was scanned. */
  token: string
  title: string
  /** True when the activity could not be read at scan time, so the registration check still has to run on send. */
  unchecked?: boolean
  tries: number
  /** Earliest server-time ms for the next automatic try. */
  nextAt: number
}

export type DropReason = 'expired' | 'notRegistered' | 'invalid'

export type PendingOutcome = { kind: 'sent'; entry: Pending; credit: Credit } | { kind: 'dropped'; entry: Pending; reason: DropReason }

const KEY = 'nuv:pending'
export const MAX_AGE_MS = 48 * 3600_000
const BACKOFF_MS = [30_000, 60_000, 120_000, 300_000]
const TICK_MS = 30_000

export const keyOf = (e: Pick<Pending, 'input'>) => `${e.input.activityId}:${e.input.student.id}`

let raw = ''
let cache: Pending[] = []
const listeners = new Set<() => void>()
const outcomeListeners = new Set<(o: PendingOutcome) => void>()

/** The queue as stored. Parsed again only when the stored text changed, so React gets a stable array. */
export function listPending(): Pending[] {
  let text = ''
  try {
    text = localStorage.getItem(KEY) ?? ''
  } catch {
    return cache
  }
  if (text !== raw) {
    raw = text
    try {
      const v = JSON.parse(text || '[]')
      cache = Array.isArray(v) ? v : []
    } catch {
      cache = []
    }
  }
  return cache
}

function write(list: Pending[]) {
  try {
    localStorage.setItem(KEY, JSON.stringify(list))
  } catch {
    // Storage full or blocked: keep the queue in memory so this session can still send it.
    cache = list
  }
  listeners.forEach((l) => l())
}

/** Saves a scan, replacing an earlier one for the same activity and student. */
export function queueClaim(e: Omit<Pending, 'tries' | 'nextAt'>) {
  const entry: Pending = { ...e, tries: 0, nextAt: now() + BACKOFF_MS[0] }
  write([...listPending().filter((p) => keyOf(p) !== keyOf(entry)), entry])
}

const remove = (e: Pending) => write(listPending().filter((p) => keyOf(p) !== keyOf(e)))

/** Removes a kept scan, e.g. because the student just got the credit directly. */
export function forgetPending(activityId: string, studentId: string) {
  const list = listPending()
  if (list.some((p) => keyOf(p) === `${activityId}:${studentId}`)) write(list.filter((p) => keyOf(p) !== `${activityId}:${studentId}`))
}

export function onPendingOutcome(fn: (o: PendingOutcome) => void) {
  outcomeListeners.add(fn)
  return () => void outcomeListeners.delete(fn)
}

const emit = (o: PendingOutcome) => outcomeListeners.forEach((l) => l(o))

export const DROP_COPY: Record<DropReason, string> = {
  expired: 'การสแกนค้างเกิน 48 ชั่วโมง ส่งไม่ได้แล้ว',
  notRegistered: 'ไม่ได้ลงทะเบียนกิจกรรมนี้ ติดต่อผู้ดูแลกิจกรรม',
  invalid: 'ไม่พบกิจกรรมนี้แล้ว ส่งการสแกนไม่ได้',
}

function drop(e: Pending, reason: DropReason) {
  remove(e)
  toast.error(`${e.title || 'กิจกรรมจิตอาสา'}: ${DROP_COPY[reason]}`)
  emit({ kind: 'dropped', entry: e, reason })
}

function retry(e: Pending) {
  const tries = e.tries + 1
  const wait = BACKOFF_MS[Math.min(tries, BACKOFF_MS.length - 1)]
  write(listPending().map((p) => (keyOf(p) === keyOf(e) ? { ...p, tries, nextAt: now() + wait } : p)))
}

async function sendOne(e: Pending) {
  if (now() - e.scannedAt > MAX_AGE_MS) return drop(e, 'expired')
  try {
    if (e.unchecked) {
      const activity = await api.getActivity(e.input.activityId)
      if (!activity) return drop(e, 'invalid')
      const reg = await api.getRegistration(e.input.activityId, e.input.student.id)
      if (!activity.walkIn && (!reg || reg.cancelledAt)) return drop(e, 'notRegistered')
    }
    const res = await api.claim({ ...e.input, scannedAt: e.scannedAt })
    // Already credited counts as sent: the student has the hours either way.
    if (!res.ok && (res.reason === 'offline' || !res.credit)) return retry(e)
    remove(e)
    if (res.ok) {
      // The inbox note is a convenience; it must never block the send.
      api.addNotice({ studentId: e.input.student.id, kind: 'credit', title: `ได้รับ ${res.credit.hours} ชั่วโมง`, body: e.title, activityId: e.input.activityId }).catch(() => {})
      toast.success(`ส่งการสแกนแล้ว ได้รับ ${res.credit.hours} ชั่วโมง`)
    }
    emit({ kind: 'sent', entry: e, credit: res.credit as Credit })
  } catch {
    retry(e)
  }
}

let running: Promise<void> | null = null

/** Tries every kept scan (only the due ones unless `force`). One run at a time. */
export function sendPending(force = false): Promise<void> {
  if (running) return running
  running = (async () => {
    for (const e of [...listPending()]) {
      if (force || e.nextAt <= now()) await sendOne(e)
    }
  })().finally(() => {
    running = null
  })
  return running
}

let started = false

/** Retries on reconnect, app start, coming back to the app, and every 30 seconds while something waits. */
export function startPendingSync() {
  if (started) return
  started = true
  const go = () => void sendPending(true)
  window.addEventListener('online', go)
  document.addEventListener('visibilitychange', () => document.visibilityState === 'visible' && listPending().length && go())
  // Another tab changed the queue.
  window.addEventListener('storage', (ev) => ev.key === KEY && listeners.forEach((l) => l()))
  setInterval(() => listPending().length && void sendPending(), TICK_MS)
  if (listPending().length) go()
}

const subscribe = (l: () => void) => {
  listeners.add(l)
  return () => void listeners.delete(l)
}

export function usePending() {
  return useSyncExternalStore(subscribe, listPending)
}
