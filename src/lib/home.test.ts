import { describe, expect, it } from 'vitest'
import { activityYear, busyDays, dayKey, liveNow, monthGrid, onDay, orderedActivities, visibleTo, yearStats } from './home'
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
    expect(s).toEqual({ label: 2569, activities: 2, people: 120 })
    expect(yearStats([], t0)).toEqual({ label: 2569, activities: 0, people: 0 })
  })
})
