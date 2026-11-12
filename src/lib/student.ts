import type { Activity, CategoryKey, MyCredit, MyRegistration } from '../data/types'
import { CATEGORY_KEYS } from '../data/categories'
import { CANCEL_DAYS, SOON_DAYS, STRIKE_LIMIT } from '../config'
import { closedAt } from './stage'

/** The student side's pure logic: what is visible, the home feed, free-cancel deadline and lost credits. */

const DAY = 24 * 3600_000

export type Phase = 'upcoming' | 'live' | 'ended'

export function phase(a: Pick<Activity, 'start' | 'end'>, now: number): Phase {
  if (now < a.start) return 'upcoming'
  if (now <= a.end) return 'live'
  return 'ended'
}

/** Hidden activities and ones still waiting for their opening time (when the supervisor asked) are not listed. */
export function isVisible(a: Activity, now: number) {
  if (a.hidden) return false
  return !(a.hideUntilOpen && a.opensAt && now < a.opensAt)
}

export const notOpenYet = (a: Activity, now: number) => !!a.opensAt && now < a.opensAt

/** Seats left, or null when the activity has no limit. */
export const seatsLeft = (a: Activity) => (a.capLimit ? Math.max(0, a.capacity - a.regCount) : null)

export const isFull = (a: Activity) => a.capLimit && a.regCount >= a.capacity

/** Last moment a registration can be cancelled without losing a credit. */
export const freeCancelUntil = (a: Activity) => a.start - (a.cancelDays ?? CANCEL_DAYS) * DAY

// Home feed ------------------------------------------------------------------------------------

export type When = 'all' | 'today' | 'week' | 'weekend' | 'month'

export const WHEN: { key: When; label: string }[] = [
  { key: 'all', label: 'ทั้งหมด' },
  { key: 'today', label: 'วันนี้' },
  { key: 'week', label: 'อาทิตย์นี้' },
  { key: 'weekend', label: 'เสาร์อาทิตย์' },
  { key: 'month', label: 'เดือนนี้' },
]

export function matchWhen(start: number, when: When, now: number) {
  if (when === 'all') return true
  const d0 = new Date(now)
  d0.setHours(0, 0, 0, 0)
  const day = Math.floor((start - d0.getTime()) / DAY)
  if (when === 'today') return day === 0
  if (when === 'week') return day >= 0 && day < 7
  if (when === 'weekend') {
    const w = new Date(start).getDay()
    return day >= 0 && day < 14 && (w === 0 || w === 6)
  }
  const s = new Date(start)
  return s.getMonth() === d0.getMonth() && s.getFullYear() === d0.getFullYear()
}

export interface FeedItem {
  a: Activity
  registered: boolean
  credited: boolean
}

export interface Feed {
  /** Everything that passed the filters, in start order. */
  items: FeedItem[]
  soon: FeedItem[]
  open: FeedItem[]
  notYet: FeedItem[]
}

export interface FeedInput {
  activities: Activity[]
  regs: MyRegistration[]
  credits: MyCredit[]
  now: number
  when: When
  seatsOnly: boolean
  /** null means every category. */
  category: CategoryKey | null
}

/** Not-ended activities the student may see, filtered, and split into the three home sections. */
export function buildFeed({ activities, regs, credits, now, when, seatsOnly, category }: FeedInput): Feed {
  const mine = new Set(regs.filter((r) => !r.cancelledAt).map((r) => r.activityId))
  const credited = new Set(credits.map((c) => c.activityId))
  const items = activities
    .filter((a) => a.end > now && (isVisible(a, now) || mine.has(a.id)))
    .filter((a) => !category || a.categoryKey === category)
    .filter((a) => matchWhen(a.start, when, now))
    .filter((a) => !seatsOnly || !isFull(a) || mine.has(a.id))
    .sort((x, y) => x.start - y.start)
    .map((a) => ({ a, registered: mine.has(a.id), credited: credited.has(a.id) }))
  const notYet = items.filter((f) => notOpenYet(f.a, now))
  const rest = items.filter((f) => !notYet.includes(f))
  const soon = rest.filter((f) => f.a.start - now < SOON_DAYS * DAY)
  const open = rest.filter((f) => !soon.includes(f))
  return { items, soon, open, notYet }
}

/** The live activity a student can scan for now: registered (or walk-in allowed), no hours yet. */
export function liveForScan(activities: Activity[], regs: MyRegistration[], credits: MyCredit[], now: number) {
  const mine = new Set(regs.filter((r) => !r.cancelledAt).map((r) => r.activityId))
  const credited = new Set(credits.map((c) => c.activityId))
  return activities.filter((a) => phase(a, now) === 'live' && !credited.has(a.id) && (mine.has(a.id) || (a.walkIn && isVisible(a, now))))
}

/** Hours earned per category, in CATEGORY_KEYS order, skipping categories with none. Credits of unknown activities are not counted. */
export function hoursByCategory(credits: MyCredit[], activities: Activity[]): { k: CategoryKey; hours: number }[] {
  const byId = new Map(activities.map((a) => [a.id, a]))
  return CATEGORY_KEYS.map((k) => ({ k, hours: credits.filter((c) => byId.get(c.activityId)?.categoryKey === k).reduce((t, c) => t + c.hours, 0) })).filter((x) => x.hours > 0)
}

// Credits ---------------------------------------------------------------------------------------

/** Semesters for the credit count: ภาค 1 is 1 May to 31 Oct, ภาค 2 is 1 Nov to 30 Apr. */
export function semesterStart(t: number) {
  const d = new Date(t)
  const m = d.getMonth()
  if (m >= 4 && m <= 9) return new Date(d.getFullYear(), 4, 1).getTime()
  return new Date(m >= 10 ? d.getFullYear() : d.getFullYear() - 1, 10, 1).getTime()
}

export function semesterEnd(t: number) {
  const s = new Date(semesterStart(t))
  return new Date(s.getFullYear(), s.getMonth() + 6, 1).getTime()
}

export const semesterNumber = (t: number) => (new Date(semesterStart(t)).getMonth() === 4 ? 1 : 2)

export interface Strike {
  a: Activity
  kind: 'late' | 'noshow'
  at: number
  waived: boolean
}

/**
 * Every credit lost this semester, newest first. A late cancel is a registration cancelled after the free
 * deadline (late flag); a no-show is a live registration without hours once the roster has closed.
 * Waived ones (registrations.waived) stay in the list but do not count.
 */
export function strikesOf(activities: Activity[], regs: MyRegistration[], credits: MyCredit[], now: number): Strike[] {
  const from = semesterStart(now)
  const byId = new Map(activities.map((a) => [a.id, a]))
  const credited = new Set(credits.map((c) => c.activityId))
  const out: Strike[] = []
  for (const r of regs) {
    const a = byId.get(r.activityId)
    if (!a) continue
    if (r.cancelledAt) {
      if (r.late && r.cancelledAt >= from) out.push({ a, kind: 'late', at: r.cancelledAt, waived: !!r.waived })
      continue
    }
    if (credited.has(a.id) || r.walkIn) continue
    const closed = closedAt(a, now)
    if (closed && closed >= from) out.push({ a, kind: 'noshow', at: closed, waived: !!r.waived })
  }
  return out.sort((x, y) => y.at - x.at)
}

export const creditsLeft = (strikes: Strike[]) => Math.max(0, STRIKE_LIMIT - strikes.filter((s) => !s.waived).length)
