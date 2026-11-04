import { describe, expect, it } from 'vitest'
import { activityYear, adminGroups, breakdownIds, categoryBreakdown, deadlineSub, orgBreakdown, busyDays, countInMonth, dayKey, fillBasis, fillPercent, groupActivities, liveNow, monthGrid, onDay, orderedActivities, regInfo, rowSub, splitUpcoming, stagesByDay, visibleTo, yearOverview, yearStats } from './home'
import type { Activity } from '../data/types'

const H = 3600_000
const DAY = 24 * H
const t0 = new Date(2026, 10, 20, 12).getTime()
let n = 0
const act = (extra: Partial<Activity> = {}) =>
  ({ id: `a${n++}`, orgCode: 'X', start: t0 - 5 * H, end: t0 - H, capLimit: false, capacity: 0, creditCount: 0, regCount: 0, ...extra }) as Activity

describe('home helpers', () => {
  it('shows admins every org and others only their own', () => {
    const l = [act({ orgCode: 'A' }), act({ orgCode: 'B' })]
    expect(visibleTo(l, { admin: false, orgCode: 'A' })).toHaveLength(1)
    expect(visibleTo(l, { admin: true, orgCode: 'A' })).toHaveLength(2)
  })

  it('finds live activities', () => {
    const live = act({ start: t0 - H, end: t0 + H })
    expect(liveNow([live, act(), act({ start: t0 + DAY, end: t0 + DAY + H })], t0)).toEqual([live])
  })

  it('orders one list: action first, then upcoming by start, then sent newest first, live left out', () => {
    const closing = act({ start: t0 - 5 * H, end: t0 - H })
    const late = act({ end: t0 - 40 * DAY, start: t0 - 40 * DAY - H })
    const soon = act({ start: t0 + DAY, end: t0 + DAY + H })
    const later = act({ start: t0 + 3 * DAY, end: t0 + 3 * DAY + H })
    const live = act({ start: t0 - H, end: t0 + H })
    const sentOld = act({ end: t0 - 9 * DAY, start: t0 - 9 * DAY - H, submittedAt: 1 })
    const sentNew = act({ end: t0 - 3 * DAY, start: t0 - 3 * DAY - H, recordedAt: 1 })
    const rows = orderedActivities([sentOld, later, live, closing, sentNew, soon, late], t0)
    expect(rows).toEqual([late, closing, soon, later, sentNew, sentOld])
    expect(new Set(rows).size).toBe(rows.length)
  })

  it('filters by day', () => {
    const a = act({ start: new Date(2026, 10, 3, 9).getTime() })
    const b = act({ start: new Date(2026, 10, 4, 9).getTime() })
    expect(onDay([a, b], '2026-11-03')).toEqual([a])
    expect(busyDays([a, b])).toEqual(new Set(['2026-11-03', '2026-11-04']))
    expect(dayKey(new Date(2026, 0, 5).getTime())).toBe('2026-01-05')
  })

  it('builds month grids, Sunday first', () => {
    const nov = monthGrid(2026, 10) // 1 Nov 2026 is a Sunday
    expect(nov[0][0]).toEqual({ key: '2026-11-01', day: 1 })
    expect(nov).toHaveLength(5)
    expect(nov.every((w) => w.length === 7)).toBe(true)
    expect(nov.flat().filter(Boolean)).toHaveLength(30)
    const feb = monthGrid(2027, 1) // 1 Feb 2027 is a Monday
    expect(feb[0][0]).toBeNull()
    expect(feb[0][1]?.day).toBe(1)
    expect(feb.flat().filter(Boolean)).toHaveLength(28)
  })

  it('finds the activity year starting 1 May', () => {
    const a = activityYear(new Date(2026, 10, 3).getTime())
    expect(a.label).toBe(2569)
    expect(a.start).toBe(new Date(2026, 4, 1).getTime())
    expect(a.end).toBe(new Date(2027, 4, 1).getTime())
    expect(activityYear(new Date(2027, 2, 31).getTime()).label).toBe(2569)
    expect(activityYear(new Date(2027, 4, 1).getTime()).label).toBe(2570)
  })

  it('computes year stats over activities that have started', () => {
    const a = act({ start: new Date(2026, 6, 1, 9).getTime(), end: new Date(2026, 6, 1, 12).getTime(), creditCount: 80 })
    const b = act({ start: new Date(2026, 7, 1, 9).getTime(), end: new Date(2026, 7, 1, 12).getTime(), creditCount: 40 })
    const old = act({ start: new Date(2026, 1, 1).getTime(), end: new Date(2026, 1, 1, 3).getTime(), creditCount: 10 })
    const future = act({ start: new Date(2026, 11, 1).getTime(), end: new Date(2026, 11, 1, 3).getTime() })
    const s = yearStats([a, b, old, future], new Date(2026, 10, 3).getTime())
    expect(s).toEqual({ label: 2569, activities: 2, people: 120, kpi: null, kpiActivities: 0 })
    expect(yearStats([], t0)).toEqual({ label: 2569, activities: 0, people: 0, kpi: null, kpiActivities: 0 })
  })

  it('splits the ordered list into to-do, upcoming and sent groups', () => {
    const closing = act({ start: t0 - 5 * H, end: t0 - H })
    const soon = act({ start: t0 + DAY, end: t0 + DAY + H })
    const sent = act({ end: t0 - 3 * DAY, start: t0 - 3 * DAY - H, submittedAt: 1 })
    const live = act({ start: t0 - H, end: t0 + H })
    expect(groupActivities([sent, soon, live, closing], t0)).toEqual({ todo: [closing], upcoming: [soon], sent: [sent] })
  })

  it('measures credits against registrations, falling back to the limit when nobody registered', () => {
    const limited = act({ capLimit: true, capacity: 300, regCount: 182, creditCount: 150 })
    expect(fillBasis(limited)).toEqual({ of: 182, byLimit: false })
    expect(fillPercent(limited)).toBe(82)
    const walkInOnly = act({ capLimit: true, capacity: 300, regCount: 0, creditCount: 150 })
    expect(fillBasis(walkInOnly)).toEqual({ of: 300, byLimit: true })
    expect(fillPercent(walkInOnly)).toBe(50)
    const open = act({ capLimit: false, regCount: 40, creditCount: 50 })
    expect(fillBasis(open)).toEqual({ of: 40, byLimit: false })
    expect(fillPercent(open)).toBe(100)
    expect(fillPercent(act())).toBe(0)
  })

  it('counts activities per month and lists stages per day', () => {
    const a = act({ start: new Date(2026, 10, 3, 9).getTime(), end: new Date(2026, 10, 3, 12).getTime() })
    const b = act({ start: new Date(2026, 10, 3, 14).getTime(), end: new Date(2026, 10, 3, 16).getTime() })
    const c = act({ start: new Date(2026, 11, 3, 9).getTime(), end: new Date(2026, 11, 3, 12).getTime() })
    expect(countInMonth([a, b, c], 2026, 10)).toBe(2)
    expect(countInMonth([a, b, c], 2026, 9)).toBe(0)
    const now = new Date(2026, 10, 3, 15).getTime()
    expect(stagesByDay([b, a, c], now).get('2026-11-03')).toEqual(['closing', 'live'])
    expect(stagesByDay([b, a, c], now).get('2026-12-03')).toEqual(['open'])
  })

  describe('turn-up percentage and overview', () => {
    const now = new Date(2026, 10, 4, 12).getTime() // 4 Nov 2026, in the 2569 year
    const at = (m: number, d: number, extra: Partial<Activity> = {}) =>
      act({ start: new Date(2026, m, d, 9).getTime(), end: new Date(2026, m, d, 15).getTime(), ...extra })

    it('uses only ended activities that limit their numbers', () => {
      const full = at(8, 1, { capLimit: true, capacity: 100, creditCount: 80, regCount: 90 })
      const half = at(9, 1, { capLimit: true, capacity: 100, creditCount: 40, regCount: 60 })
      const open = at(7, 1, { capLimit: false, creditCount: 500, regCount: 500 })
      const notEnded = at(10, 4, { capLimit: true, capacity: 100, creditCount: 10, start: now - H, end: now + H })
      const old = at(1, 1, { capLimit: true, capacity: 100, creditCount: 1 }) // previous activity year
      const s = yearStats([full, half, open, notEnded, old], now)
      expect(s.kpi).toBe(60)
      expect(s.kpiActivities).toBe(2)
      expect(s.activities).toBe(4)
      expect(s.people).toBe(80 + 40 + 500 + 10)
      expect(yearStats([open], now).kpi).toBeNull()
    })

    it('sums people per month from May and finds this month', () => {
      const may = at(4, 10, { creditCount: 30, regCount: 40 })
      const nov = at(10, 2, { creditCount: 20, regCount: 25 })
      const novLater = at(10, 20, { creditCount: 0, regCount: 12 })
      const closing = at(9, 30, { creditCount: 5, regCount: 5 }) // ended, roster still open
      const o = yearOverview([may, nov, novLater, closing], now)
      expect(o.monthly).toEqual([30, 0, 0, 0, 0, 5, 20, 0, 0, 0, 0, 0])
      expect(o.currentMonth).toBe(6)
      expect(o.registered).toBe(40 + 25 + 5)
      expect(o.month).toEqual({ held: 1, upcoming: 1, people: 20, unsent: 3 })
    })

    it('leaves out other activity years from the bars', () => {
      const prev = at(2, 1, { creditCount: 99 })
      expect(yearOverview([prev], now).monthly.every((n) => n === 0)).toBe(true)
    })
  })
})

describe('upcoming split', () => {
  const up = (i: number) => act({ id: `u${i}`, start: t0 + i * DAY, end: t0 + i * DAY + H })
  const five = [1, 2, 3, 4, 5].map(up)

  it('makes the nearest the hero when nothing is live, and does not repeat it', () => {
    const s = splitUpcoming(five, false)
    expect(s.hero).toBe(five[0])
    expect(s.big).toEqual(five.slice(1, 4))
    expect(s.small).toEqual([five[4]])
  })

  it('has no hero while something is live: three big cards then rows', () => {
    const s = splitUpcoming(five, true)
    expect(s.hero).toBeUndefined()
    expect(s.big).toEqual(five.slice(0, 3))
    expect(s.small).toEqual(five.slice(3))
  })

  it('copes with nothing upcoming', () => {
    expect(splitUpcoming([], false)).toEqual({ hero: undefined, big: [], small: [] })
  })
})

describe('poster card texts', () => {
  it('says seats and what is left, or full', () => {
    const a = act({ start: t0 + DAY, end: t0 + DAY + H, capLimit: true, capacity: 300, regCount: 182 })
    expect(regInfo(a, t0)).toEqual({ text: 'ลงทะเบียนแล้ว 182 จาก 300 คน', side: 'เหลือ 118 ที่', fill: 182 / 300 })
    expect(regInfo({ ...a, regCount: 300 }, t0).side).toBe('เต็มแล้ว')
  })

  it('gives a head count without a limit, the rate for bottles, and the opening time before it opens', () => {
    const open = act({ start: t0 + DAY, end: t0 + DAY + H, regCount: 12 })
    expect(regInfo(open, t0)).toEqual({ text: 'ลงทะเบียนแล้ว 12 คน' })
    expect(regInfo({ ...open, itemsPerHour: 10, hours: 3 }, t0)).toEqual({ text: '10 ขวด = 1 ชั่วโมง', side: 'สูงสุด 3 ชั่วโมง' })
    const soon = act({ start: t0 + 9 * DAY, end: t0 + 9 * DAY + H, opensAt: new Date(2026, 10, 25, 9).getTime(), capLimit: true, capacity: 40 })
    expect(regInfo(soon, t0)).toEqual({ text: 'เปิดรับ 25 พ.ย. 09:00 น.', side: 'รับ 40 คน' })
  })

  it('writes one short line per row stage', () => {
    const ended = act({ start: t0 - 5 * H, end: t0 - H, creditCount: 36 })
    expect(rowSub(ended, 'closing', t0)).toBe('ได้รับชั่วโมง 36 คน')
    expect(rowSub(ended, 'submit', t0)).toBe('อีก 30 วัน')
    expect(rowSub(ended, 'submit', t0 + 40 * DAY)).toBe('เลยกำหนดส่งแล้ว')
    const open = act({ start: t0 + DAY, end: t0 + DAY + H, capLimit: true, capacity: 30, regCount: 12 })
    expect(rowSub(open, 'open', t0)).toBe('ลงทะเบียน 12 จาก 30 คน')
    const sent = act({ submittedAt: new Date(2026, 9, 26, 9).getTime() })
    expect(rowSub(sent, 'waiting', t0)).toBe('ส่งแล้ว 26 ต.ค. 2569')
  })
})

describe('admin home', () => {
  const ended = (extra: Partial<Activity>) => act({ start: t0 - 5 * H, end: t0 - H, ...extra })
  const sent = (orgCode: string, submittedAt: number) => ended({ orgCode, closedAt: 1, submittedAt })
  const waitA = sent('A', 300)
  const waitB = sent('B', 100)
  const ownClosing = ended({ orgCode: 'ME' })
  const ownLate = ended({ orgCode: 'ME', start: t0 - 40 * DAY, end: t0 - 40 * DAY + H, closedAt: 1 })
  const otherNear = ended({ orgCode: 'A', start: t0 - 10 * DAY, end: t0 - 10 * DAY + H, closedAt: 1 })
  const otherFar = ended({ orgCode: 'B', start: t0 - 2 * DAY, end: t0 - 2 * DAY + H })
  const soon = act({ orgCode: 'A', start: t0 + DAY, end: t0 + DAY + H })
  const later = act({ orgCode: 'B', start: t0 + 2 * DAY, end: t0 + 2 * DAY + H })
  const live = act({ orgCode: 'A', start: t0 - H, end: t0 + H })
  const recOld = ended({ orgCode: 'A', submittedAt: 1, recordedAt: 10 })
  const recNew = ended({ orgCode: 'B', submittedAt: 1, recordedAt: 20 })
  const all = [recOld, later, waitA, otherFar, live, ownClosing, soon, waitB, otherNear, recNew, ownLate]
  const g = adminGroups(all, { orgCode: 'ME', orgName: 'ศูนย์' }, t0)

  it('puts the oldest sent roster first, from every org', () => {
    expect(g.waiting).toEqual([waitB, waitA])
  })

  it('keeps only the own org activities in the to-do list, oldest first', () => {
    expect(g.todo).toEqual([ownLate, ownClosing])
  })

  it('lists other orgs that have not sent by nearest deadline, own org excluded', () => {
    expect(g.unsent).toEqual([otherNear, otherFar])
  })

  it('lists upcoming in start order, leaves live out and puts the newest recorded first', () => {
    expect(g.upcoming).toEqual([soon, later])
    expect(g.done).toEqual([recNew, recOld])
    const every = Object.values(g).flat()
    expect(every).not.toContain(live)
    expect(new Set(every).size).toBe(every.length)
  })

  it('counts another code with the centre name as its own', () => {
    const twin = ended({ orgCode: 'ME2', org: 'ศูนย์' })
    const g2 = adminGroups([twin], { orgCode: 'ME', orgName: 'ศูนย์' }, t0)
    expect(g2.todo).toEqual([twin])
    expect(g2.unsent).toEqual([])
  })

  it('has empty groups for an empty list', () => {
    expect(adminGroups([], { orgCode: 'ME', orgName: 'ศูนย์' }, t0)).toEqual({ waiting: [], todo: [], unsent: [], upcoming: [], done: [] })
  })

  it('says how long is left to send, or that it is late', () => {
    expect(deadlineSub(otherFar, t0)).toEqual({ text: 'อีก 29 วัน', late: false })
    expect(deadlineSub(otherNear, t0)).toEqual({ text: 'อีก 21 วัน', late: false })
    expect(deadlineSub(ownLate, t0)).toEqual({ text: 'เลยกำหนดส่งแล้ว', late: true })
  })
})

describe('admin stats breakdowns', () => {
  const inYear = (extra: Partial<Activity>) => act({ start: new Date(2026, 5, 10, 9).getTime(), end: new Date(2026, 5, 10, 15).getTime(), ...extra })
  const a1 = inYear({ orgCode: 'A', org: 'คณะ ก', categoryKey: 'blood', creditCount: 10, submittedAt: 1 })
  const a2 = inYear({ orgCode: 'A', org: 'คณะ ก', categoryKey: 'setup', creditCount: 4, submittedAt: 1, recordedAt: 2 })
  const a3 = inYear({ orgCode: 'A', org: 'คณะ ก', categoryKey: 'blood', creditCount: 5 })
  const b1 = inYear({ orgCode: 'B', org: 'คณะ ข', categoryKey: 'blood', creditCount: 7 })
  const lastYear = inYear({ orgCode: 'C', org: 'คณะ ค', start: new Date(2026, 2, 10).getTime(), end: new Date(2026, 2, 10, 5).getTime() })
  const notStarted = inYear({ orgCode: 'D', org: 'คณะ ง', start: t0 + DAY, end: t0 + DAY + H })
  const list = [b1, a1, a2, a3, lastYear, notStarted]

  it('counts started activities, credited people and waiting rosters per org, busiest first', () => {
    expect(orgBreakdown(list, t0)).toEqual([
      { orgCode: 'A', name: 'คณะ ก', activities: 3, people: 19, waiting: 1 },
      { orgCode: 'B', name: 'คณะ ข', activities: 1, people: 7, waiting: 0 },
    ])
  })

  it('merges codes that share an organisation name', () => {
    const twin = inYear({ orgCode: 'A2', org: 'คณะ ก', categoryKey: 'blood', creditCount: 1 })
    expect(orgBreakdown([...list, twin], t0)[0]).toMatchObject({ name: 'คณะ ก', activities: 4, people: 20 })
  })

  it('counts the same activities as the target card', () => {
    expect(orgBreakdown(list, t0).reduce((s, r) => s + r.activities, 0)).toBe(yearStats(list, t0).activities)
    expect(breakdownIds(list, t0).sort()).toEqual([a1.id, a2.id, a3.id, b1.id].sort())
  })

  it('groups by category, with hours only once they are known', () => {
    expect(categoryBreakdown(list, t0)).toEqual([
      { key: 'blood', label: 'บริจาคโลหิต', activities: 3 },
      { key: 'setup', label: 'จัดสถานที่', activities: 1 },
    ])
    expect(categoryBreakdown(list, t0, { [a1.id]: 60, [a2.id]: 20, [a3.id]: 30, [b1.id]: 42 })).toEqual([
      { key: 'blood', label: 'บริจาคโลหิต', activities: 3, hours: 132 },
      { key: 'setup', label: 'จัดสถานที่', activities: 1, hours: 20 },
    ])
  })
})
