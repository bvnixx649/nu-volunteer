import { categoryOf } from '../data/categories'
import type { Activity } from '../data/types'
import { fmtHours, thDate, thDayMonth, thTime } from './format'
import { daysToSubmit, stage, submitDeadline, type Stage } from './stage'

/** The supervisor home's pure logic: one ordered activity list, calendar grid, activity year, KPI. */

export const TH_MONTHS = ['มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน', 'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม']
export const TH_MONTHS_SHORT = ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.']
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

/** How many activities start in the given month (`month` is 0 to 11). */
export const countInMonth = (list: Activity[], year: number, month: number) =>
  list.filter((a) => {
    const d = new Date(a.start)
    return d.getFullYear() === year && d.getMonth() === month
  }).length

/** The stages of the activities that start on each day, in start order, for the calendar dots. */
export function stagesByDay(list: Activity[], now: number): Map<string, Stage[]> {
  const out = new Map<string, Stage[]>()
  for (const a of [...list].sort((x, y) => x.start - y.start)) {
    const k = dayKey(a.start)
    out.set(k, [...(out.get(k) ?? []), stage(a, now)])
  }
  return out
}

export interface Groups {
  /** Ended, and the supervisor still has to check or send the roster. */
  todo: Activity[]
  /** Not started: scheduled or open for registration. */
  upcoming: Activity[]
  /** Roster sent to the centre, or recorded by it. */
  sent: Activity[]
}

/** The ordered list (see `orderedActivities`) split into the three groups the supervisor home shows. */
export function groupActivities(list: Activity[], now: number): Groups {
  const g: Groups = { todo: [], upcoming: [], sent: [] }
  for (const a of orderedActivities(list, now)) {
    const r = RANK[stage(a, now)]
    ;(r === 0 ? g.todo : r === 1 ? g.upcoming : g.sent).push(a)
  }
  return g
}

/** The nearest this many upcoming activities are shown as big poster cards; the rest are compact rows. */
export const BIG_UPCOMING = 3

export interface UpcomingSplit {
  /** With nothing live, the nearest upcoming activity is the hero card at the top and is not repeated below. */
  hero?: Activity
  big: Activity[]
  small: Activity[]
}

/** Splits the upcoming list (already in start order) into the hero card, the big poster cards and the compact rows. */
export function splitUpcoming(upcoming: Activity[], hasLive: boolean): UpcomingSplit {
  const rest = hasLive ? upcoming : upcoming.slice(1)
  return { hero: hasLive ? undefined : upcoming[0], big: rest.slice(0, BIG_UPCOMING), small: rest.slice(BIG_UPCOMING) }
}

const n = (v: number) => v.toLocaleString('th-TH')

/** The one short muted line beside a row's status tag. */
export function rowSub(a: Activity, s: Stage, now: number): string {
  switch (s) {
    case 'closing':
      return `ได้รับชั่วโมง ${n(a.creditCount)} คน`
    case 'submit': {
      const days = daysToSubmit(a, now)
      return days > 0 ? `อีก ${days} วัน` : 'เลยกำหนดส่งแล้ว'
    }
    case 'open':
      if (a.itemsPerHour) return `${a.itemsPerHour} ขวด = 1 ชั่วโมง`
      return a.capLimit && a.capacity > 0 ? `ลงทะเบียน ${n(a.regCount)} จาก ${n(a.capacity)} คน` : `ลงทะเบียน ${n(a.regCount)} คน`
    case 'scheduled':
      return a.opensAt ? `เปิดรับ ${thDayMonth(a.opensAt)} ${thTime(a.opensAt)} น.` : 'ยังไม่เปิดรับ'
    default:
      return `ส่งแล้ว ${thDate(a.submittedAt ?? a.recordedAt ?? a.end)}`
  }
}

export interface RegInfo {
  /** Left text under a poster card. */
  text: string
  /** Right text: seats left, the bottle cap or how many are taken. */
  side?: string
  /** 0 to 1 share of the seats taken; only when the activity limits its numbers and is open. */
  fill?: number
}

/** What a poster card says about registration: seat bar and seats left, a head count, the bottle rate, or when it opens. */
export function regInfo(a: Activity, now: number): RegInfo {
  if (a.itemsPerHour) return { text: `${a.itemsPerHour} ขวด = 1 ชั่วโมง`, side: `สูงสุด ${fmtHours(a.hours)} ชั่วโมง` }
  const limited = a.capLimit && a.capacity > 0
  if (stage(a, now) === 'scheduled' && a.opensAt)
    return { text: `เปิดรับ ${thDayMonth(a.opensAt)} ${thTime(a.opensAt)} น.`, side: limited ? `รับ ${n(a.capacity)} คน` : undefined }
  if (!limited) return { text: `ลงทะเบียนแล้ว ${n(a.regCount)} คน` }
  const left = Math.max(0, a.capacity - a.regCount)
  return {
    text: `ลงทะเบียนแล้ว ${n(a.regCount)} จาก ${n(a.capacity)} คน`,
    side: left ? `เหลือ ${n(left)} ที่` : 'เต็มแล้ว',
    fill: Math.min(1, a.regCount / a.capacity),
  }
}

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

/**
 * What the credited count is measured against during the day: who registered, since that is who is expected.
 * The seat limit is the fallback only when nobody registered (walk-in only activities).
 */
export const fillBasis = (a: Pick<Activity, 'capLimit' | 'capacity' | 'regCount'>) =>
  a.regCount > 0 || !(a.capLimit && a.capacity > 0) ? { of: a.regCount, byLimit: false } : { of: a.capacity, byLimit: true }

/** Whole percent (0 to 100) of the basis that already has hours. */
export const fillPercent = (a: Pick<Activity, 'capLimit' | 'capacity' | 'regCount' | 'creditCount'>) => {
  const { of } = fillBasis(a)
  return of > 0 ? Math.min(100, Math.round((a.creditCount / of) * 100)) : 0
}

export interface YearStats {
  label: number
  /** Activities in the year that have started. */
  activities: number
  /** Sum of creditCount over those. */
  people: number
  /** Percent of seats filled, over activities in the year that ended and limit their numbers; null when there are none. */
  kpi: number | null
  /** How many activities that percent is over. */
  kpiActivities: number
}

const inActivityYear = (list: Activity[], now: number) => {
  const y = activityYear(now)
  return { y, inYear: list.filter((a) => a.start >= y.start && a.start < y.end) }
}

/** Numbers come from the activity documents only. There is no total of hours anywhere. */
export function yearStats(list: Activity[], now: number): YearStats {
  const { y, inYear } = inActivityYear(list, now)
  const started = inYear.filter((a) => a.start <= now)
  const counted = inYear.filter((a) => a.end < now && a.capLimit && a.capacity > 0)
  const seats = counted.reduce((s, a) => s + a.capacity, 0)
  const came = counted.reduce((s, a) => s + a.creditCount, 0)
  return {
    label: y.label,
    activities: started.length,
    people: started.reduce((s, a) => s + a.creditCount, 0),
    kpi: seats > 0 ? Math.round((came / seats) * 100) : null,
    kpiActivities: counted.length,
  }
}

export interface MonthSummary {
  /** Activities this calendar month that have started. */
  held: number
  /** Activities this calendar month that have not started. */
  upcoming: number
  /** People credited in the ones that have started. */
  people: number
  /** Activities (any month) whose roster is not at the centre yet, because it is still being checked or waits to be sent. */
  unsent: number
}

export interface YearOverview extends YearStats {
  /** Sum of regCount over activities that have started. */
  registered: number
  /** People credited per month, May first to April last, by the month each activity started in. */
  monthly: number[]
  /** Index into `monthly` for the current month. */
  currentMonth: number
  month: MonthSummary
}

/** The statistics tab: everything in `yearStats`, plus registrations, the monthly bars and this month. */
export function yearOverview(list: Activity[], now: number): YearOverview {
  const base = yearStats(list, now)
  const { inYear } = inActivityYear(list, now)
  const started = inYear.filter((a) => a.start <= now)
  const monthly = Array<number>(12).fill(0)
  for (const a of started) monthly[(new Date(a.start).getMonth() - YEAR_START_MONTH + 12) % 12] += a.creditCount

  const cur = new Date(now)
  const thisMonth = list.filter((a) => {
    const d = new Date(a.start)
    return d.getFullYear() === cur.getFullYear() && d.getMonth() === cur.getMonth()
  })
  const held = thisMonth.filter((a) => a.start <= now)
  return {
    ...base,
    registered: started.reduce((s, a) => s + a.regCount, 0),
    monthly,
    currentMonth: (cur.getMonth() - YEAR_START_MONTH + 12) % 12,
    month: {
      held: held.length,
      upcoming: thisMonth.length - held.length,
      people: held.reduce((s, a) => s + a.creditCount, 0),
      unsent: list.filter((a) => ['closing', 'submit'].includes(stage(a, now))).length,
    },
  }
}

export interface AdminGroups {
  /** Roster sent by an organisation, any org, waiting for the centre to record it. Oldest sent first. */
  waiting: Activity[]
  /** The centre's own activities that still need its supervisor: closing or sending. Oldest first. */
  todo: Activity[]
  /** Other organisations' activities that ended and are not sent yet, the nearest send deadline first. */
  unsent: Activity[]
  /** Not started yet, any org, in start order. */
  upcoming: Activity[]
  /** Recorded by the centre, newest recorded first. */
  done: Activity[]
}

/**
 * The centre admin's home: the supervisor groups plus the work the centre does for every organisation. `list` is every
 * org's activities. The centre signs in with more than one code (NUVOL69 and NUADMIN share its name), so "own" is the
 * admin's code or any code with the same organisation name.
 */
export function adminGroups(list: Activity[], own: { orgCode: string; orgName: string }, now: number): AdminGroups {
  const by = (...s: Stage[]) => list.filter((a) => s.includes(stage(a, now)))
  const isOwn = (a: Activity) => a.orgCode === own.orgCode || a.org === own.orgName
  const ended = by('closing', 'submit')
  return {
    waiting: by('waiting').sort((a, b) => a.submittedAt! - b.submittedAt!),
    todo: ended.filter(isOwn).sort((a, b) => a.start - b.start),
    unsent: ended.filter((a) => !isOwn(a)).sort((a, b) => submitDeadline(a) - submitDeadline(b)),
    upcoming: by('scheduled', 'open').sort((a, b) => a.start - b.start),
    done: by('done').sort((a, b) => b.recordedAt! - a.recordedAt!),
  }
}

/** The line beside the stage tag of an activity whose roster is overdue or due: days left, or that the deadline has passed. */
export function deadlineSub(a: Activity, now: number): { text: string; late: boolean } {
  const days = daysToSubmit(a, now)
  return days > 0 ? { text: `อีก ${n(days)} วัน`, late: false } : { text: 'เลยกำหนดส่งแล้ว', late: true }
}

/** Activities that started in the activity year containing `now`, which is what the target and the breakdowns count. */
export function startedThisYear(list: Activity[], now: number) {
  return inActivityYear(list, now).inYear.filter((a) => a.start <= now)
}

export interface OrgRow {
  orgCode: string
  name: string
  activities: number
  /** People credited, summed over the org's activities. */
  people: number
  /** Activities waiting for the centre to record. */
  waiting: number
}

/** One row per organisation with an activity started this year, the busiest first. */
export function orgBreakdown(list: Activity[], now: number): OrgRow[] {
  const rows = new Map<string, OrgRow>()
  for (const a of startedThisYear(list, now)) {
    // One row per organisation name: the centre's two codes (supervisor and admin) are one organisation.
    const r = rows.get(a.org) ?? { orgCode: a.orgCode, name: a.org, activities: 0, people: 0, waiting: 0 }
    r.activities += 1
    r.people += a.creditCount
    if (stage(a, now) === 'waiting') r.waiting += 1
    rows.set(a.org, r)
  }
  return [...rows.values()].sort((a, b) => b.activities - a.activities || a.name.localeCompare(b.name, 'th'))
}

export interface CategoryRow {
  key: string
  label: string
  activities: number
  /** Hours issued; undefined until the credits have been read. */
  hours?: number
}

/** The activities that count in the breakdowns, so the screen can ask for their hours. */
export const breakdownIds = (list: Activity[], now: number) => startedThisYear(list, now).map((a) => a.id)

/** One row per category used this year, the busiest first. `hoursById` is the sum of credited hours per activity, once loaded. */
export function categoryBreakdown(list: Activity[], now: number, hoursById?: Record<string, number>): CategoryRow[] {
  const rows = new Map<string, CategoryRow>()
  for (const a of startedThisYear(list, now)) {
    const r = rows.get(a.categoryKey) ?? { key: a.categoryKey, label: categoryOf(a.categoryKey).label, activities: 0, ...(hoursById && { hours: 0 }) }
    r.activities += 1
    if (hoursById && r.hours !== undefined) r.hours += hoursById[a.id] ?? 0
    rows.set(a.categoryKey, r)
  }
  return [...rows.values()].sort((a, b) => b.activities - a.activities || a.label.localeCompare(b.label, 'th'))
}
