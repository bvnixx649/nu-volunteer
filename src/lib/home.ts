import type { Activity } from '../data/types'
import { daysToSubmit, stage, type Stage } from './stage'

/** The supervisor home's pure logic: to-do list, status groups, calendar grid, activity year, KPI. */

export const TH_MONTHS = ['มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน', 'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม']
/** Sunday first, as Thai wall calendars do. */
export const TH_WEEKDAYS = ['อา', 'จ', 'อ', 'พ', 'พฤ', 'ศ', 'ส']

/** Activity year starts on 1 May (month index 4), the centre's year from the prototype. */
export const YEAR_START_MONTH = 4

/** Only the activities this session may see: the whole list for admins, else the org's own. */
export function visibleTo(list: Activity[], sup: { admin: boolean; orgCode: string }) {
  return list.filter((a) => sup.admin || a.orgCode === sup.orgCode)
}

export const liveNow = (list: Activity[], now: number) =>
  list.filter((a) => stage(a, now) === 'live').sort((a, b) => a.start - b.start)

export type TodoKind = 'close' | 'submit'
export interface Todo {
  activity: Activity
  kind: TodoKind
  /** Whole days left to send the roster; only for kind "submit". */
  days?: number
  overdue: boolean
}

/** One row per pending action: close the roster first, then send it. Oldest activity first. */
export function todos(list: Activity[], now: number): Todo[] {
  const rows: Todo[] = []
  for (const activity of list) {
    const s = stage(activity, now)
    if (s === 'closing') rows.push({ activity, kind: 'close', overdue: false })
    if (s === 'submit') {
      const days = daysToSubmit(activity, now)
      rows.push({ activity, kind: 'submit', days, overdue: days <= 0 })
    }
  }
  const rank = (t: Todo) => (t.kind === 'close' ? 0 : 1)
  return rows.sort((a, b) => rank(a) - rank(b) || a.activity.end - b.activity.end)
}

export interface Group {
  key: 'upcoming' | 'pending' | 'sent'
  title: string
  items: Activity[]
}

const GROUPS: { key: Group['key']; title: string; stages: Stage[] }[] = [
  { key: 'upcoming', title: 'กำลังจะมาถึง', stages: ['scheduled', 'open'] },
  { key: 'pending', title: 'รอปิดหรือส่งรายชื่อ', stages: ['closing', 'submit'] },
  { key: 'sent', title: 'ส่งแล้ว', stages: ['waiting', 'done'] },
]

/** Activities by status. Live ones are left out (they have their own card). Empty groups are dropped. */
export function groupByStatus(list: Activity[], now: number): Group[] {
  return GROUPS.map((g) => {
    const items = list
      .filter((a) => g.stages.includes(stage(a, now)))
      .sort((a, b) => (g.key === 'sent' ? b.start - a.start : a.start - b.start))
    return { key: g.key, title: g.title, items }
  }).filter((g) => g.items.length)
}

/** Local calendar day as yyyy-mm-dd. */
export function dayKey(ms: number) {
  const d = new Date(ms)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

export const onDay = (list: Activity[], key: string) => list.filter((a) => dayKey(a.start) === key)

export interface Cell {
  key: string
  day: number
}

/** Weeks of a month (Sunday first). Cells outside the month are null. `month` is 0 to 11. */
export function monthGrid(year: number, month: number): (Cell | null)[][] {
  const lead = new Date(year, month, 1).getDay()
  const total = new Date(year, month + 1, 0).getDate()
  const cells: (Cell | null)[] = Array(lead).fill(null)
  for (let day = 1; day <= total; day++) cells.push({ key: dayKey(new Date(year, month, day).getTime()), day })
  while (cells.length % 7) cells.push(null)
  const weeks: (Cell | null)[][] = []
  for (let i = 0; i < cells.length; i += 7) weeks.push(cells.slice(i, i + 7))
  return weeks
}

/** Day keys that have an activity, for the calendar dots. */
export const busyDays = (list: Activity[]) => new Set(list.map((a) => dayKey(a.start)))

/** The activity year containing `t`: [start, end) and its Buddhist-era label (year it starts in). */
export function activityYear(t: number) {
  const d = new Date(t)
  const y = d.getMonth() >= YEAR_START_MONTH ? d.getFullYear() : d.getFullYear() - 1
  return { start: new Date(y, YEAR_START_MONTH, 1).getTime(), end: new Date(y + 1, YEAR_START_MONTH, 1).getTime(), label: y + 543 }
}

export interface YearStats {
  label: number
  /** Activities in the year that have started. */
  activities: number
  /** Sum of creditCount over those. */
  people: number
  /** Ended activities with a seat limit: people credited vs seats offered. */
  kpi: { credited: number; capacity: number; percent: number } | null
}

/** Numbers come from the activity documents only. KPI is null when no ended activity has a seat limit. */
export function yearStats(list: Activity[], now: number): YearStats {
  const y = activityYear(now)
  const inYear = list.filter((a) => a.start >= y.start && a.start < y.end && a.start <= now)
  const ended = inYear.filter((a) => a.end < now && a.capLimit && a.capacity > 0)
  const capacity = ended.reduce((s, a) => s + a.capacity, 0)
  const credited = ended.reduce((s, a) => s + a.creditCount, 0)
  return {
    label: y.label,
    activities: inYear.length,
    people: inYear.reduce((s, a) => s + a.creditCount, 0),
    kpi: capacity ? { credited, capacity, percent: Math.round((credited / capacity) * 100) } : null,
  }
}
