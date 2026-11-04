import type { Activity } from '../data/types'
import { stage, type Stage } from './stage'

/** The supervisor home's pure logic: one ordered activity list, calendar grid, activity year, KPI. */

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

/** Rank in the one list: needs action first, then upcoming, then sent. Live ones have their own card. */
const RANK: Partial<Record<Stage, number>> = { closing: 0, submit: 0, scheduled: 1, open: 1, waiting: 2, done: 2 }

/**
 * Every activity that is not live, in one list: rows needing action first (oldest first),
 * then upcoming by start, then sent newest first. Each activity appears once.
 */
export function orderedActivities(list: Activity[], now: number): Activity[] {
  const rank = (a: Activity) => RANK[stage(a, now)]
  return list
    .filter((a) => rank(a) !== undefined)
    .sort((a, b) => {
      const ra = rank(a)!
      const rb = rank(b)!
      if (ra !== rb) return ra - rb
      return ra === 2 ? b.start - a.start : a.start - b.start
    })
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
}

/** Numbers come from the activity documents only. */
export function yearStats(list: Activity[], now: number): YearStats {
  const y = activityYear(now)
  const inYear = list.filter((a) => a.start >= y.start && a.start < y.end && a.start <= now)
  return {
    label: y.label,
    activities: inYear.length,
    people: inYear.reduce((s, a) => s + a.creditCount, 0),
  }
}
