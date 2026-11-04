import { describe, expect, it } from 'vitest'
import type { Activity, MyCredit, MyRegistration } from '../data/types'
import { buildFeed, creditsLeft, freeCancelUntil, hoursByCategory, isVisible, matchWhen, phase, semesterStart, strikesOf } from './student'
import { fmtHours, relDay, timeAgo } from './format'

const H = 3600_000
const DAY = 24 * H
const NOW = new Date(2026, 10, 3, 12).getTime()

const act = (id: string, over: Partial<Activity> = {}): Activity =>
  ({
    id,
    title: id,
    categoryKey: 'blood',
    start: NOW + 2 * DAY,
    end: NOW + 2 * DAY + 4 * H,
    hours: 6,
    capLimit: false,
    capacity: 0,
    regCount: 0,
    creditCount: 0,
    walkIn: false,
    ...over,
  }) as Activity

const reg = (activityId: string, over: Partial<MyRegistration> = {}): MyRegistration => ({ activityId, studentId: '65010001', name: 'x', at: NOW - DAY, ...over })
const credit = (activityId: string): MyCredit => ({ activityId, studentId: '65010001', name: 'x', hours: 6, fullHours: 6, at: NOW, method: 'qr', flags: [] })

describe('phase and visibility', () => {
  it('splits time into upcoming, live and ended', () => {
    const a = act('a', { start: NOW - H, end: NOW + H })
    expect(phase(a, NOW)).toBe('live')
    expect(phase(a, NOW - 2 * H)).toBe('upcoming')
    expect(phase(a, NOW + 2 * H)).toBe('ended')
  })
  it('hides hidden activities and ones waiting to open when asked', () => {
    expect(isVisible(act('a', { hidden: true }), NOW)).toBe(false)
    expect(isVisible(act('a', { opensAt: NOW + H, hideUntilOpen: true }), NOW)).toBe(false)
    expect(isVisible(act('a', { opensAt: NOW + H }), NOW)).toBe(true)
  })
})

describe('free cancel deadline', () => {
  it('is 2 days before start unless the activity says otherwise', () => {
    expect(freeCancelUntil(act('a'))).toBe(NOW)
    expect(freeCancelUntil(act('a', { cancelDays: 0 }))).toBe(NOW + 2 * DAY)
  })
})

describe('home feed', () => {
  const list = [
    act('soon', { start: NOW + DAY, end: NOW + DAY + H }),
    act('later', { start: NOW + 10 * DAY, end: NOW + 10 * DAY + H, categoryKey: 'bottle' }),
    act('wait', { start: NOW + 20 * DAY, end: NOW + 20 * DAY + H, opensAt: NOW + 5 * DAY }),
    act('past', { start: NOW - 3 * DAY, end: NOW - 2 * DAY }),
    act('secret', { hidden: true }),
    act('full', { start: NOW + 5 * DAY, end: NOW + 5 * DAY + H, capLimit: true, capacity: 2, regCount: 2 }),
  ]
  const base = { activities: list, regs: [], credits: [], now: NOW, when: 'all' as const, seatsOnly: false, category: null }

  it('groups into soon, open and not yet open, dropping past and hidden', () => {
    const f = buildFeed(base)
    expect(f.soon.map((x) => x.a.id)).toEqual(['soon'])
    expect(f.open.map((x) => x.a.id)).toEqual(['full', 'later'])
    expect(f.notYet.map((x) => x.a.id)).toEqual(['wait'])
  })
  it('filters by category and seats', () => {
    expect(buildFeed({ ...base, category: 'bottle' }).items.map((x) => x.a.id)).toEqual(['later'])
    expect(buildFeed({ ...base, seatsOnly: true }).items.map((x) => x.a.id)).not.toContain('full')
  })
  it('keeps a full activity the student is registered for under the seats filter', () => {
    const f = buildFeed({ ...base, seatsOnly: true, regs: [reg('full')] })
    expect(f.items.map((x) => x.a.id)).toContain('full')
  })
  it('shows a hidden activity to someone registered', () => {
    expect(buildFeed({ ...base, regs: [reg('secret')] }).items.map((x) => x.a.id)).toContain('secret')
  })
  it('matches day filters', () => {
    expect(matchWhen(NOW + 3 * H, 'today', NOW)).toBe(true)
    expect(matchWhen(NOW + DAY, 'tomorrow', NOW)).toBe(true)
    expect(matchWhen(NOW + 8 * DAY, 'week', NOW)).toBe(false)
  })
})

describe('credits', () => {
  it('starts semester 1 in May and semester 2 in November', () => {
    expect(new Date(semesterStart(new Date(2026, 6, 1).getTime())).getMonth()).toBe(4)
    expect(new Date(semesterStart(NOW)).getMonth()).toBe(10)
    const jan = new Date(semesterStart(new Date(2027, 0, 5).getTime()))
    expect([jan.getFullYear(), jan.getMonth()]).toEqual([2026, 10])
  })

  const ended = act('e', { start: NOW - 3 * DAY, end: NOW - 2 * DAY })
  it('counts late cancels this semester', () => {
    const s = strikesOf([ended], [reg('e', { cancelledAt: NOW - 2 * DAY, late: true })], [], NOW)
    expect(s).toMatchObject([{ kind: 'late', waived: false }])
    expect(creditsLeft(s)).toBe(2)
  })
  it('ignores free cancels and waived strikes in the total', () => {
    expect(strikesOf([ended], [reg('e', { cancelledAt: NOW - 2 * DAY })], [], NOW)).toEqual([])
    const s = strikesOf([ended], [reg('e', { cancelledAt: NOW - 2 * DAY, late: true, waived: true })], [], NOW)
    expect(s).toHaveLength(1)
    expect(creditsLeft(s)).toBe(3)
  })
  it('counts a no-show once the roster is closed, but not walk-ins or credited people', () => {
    expect(strikesOf([ended], [reg('e')], [], NOW)).toMatchObject([{ kind: 'noshow' }])
    expect(strikesOf([ended], [reg('e')], [credit('e')], NOW)).toEqual([])
    expect(strikesOf([ended], [reg('e', { walkIn: true })], [], NOW)).toEqual([])
    const open = act('o', { start: NOW - 3 * H, end: NOW - H })
    expect(strikesOf([open], [reg('o')], [], NOW)).toEqual([])
  })
  it('never goes below zero', () => {
    const many = ['a', 'b', 'c', 'd'].map((id) => act(id, { start: NOW - 3 * DAY, end: NOW - 2 * DAY }))
    const regs = many.map((a) => reg(a.id, { cancelledAt: NOW - 2 * DAY, late: true }))
    expect(creditsLeft(strikesOf(many, regs, [], NOW))).toBe(0)
  })
})

describe('student formatting', () => {
  it('writes whole hours without decimals', () => {
    expect(fmtHours(6)).toBe('6')
    expect(fmtHours(2.5)).toBe('2.5')
  })
  it('says today and tomorrow', () => {
    expect(relDay(NOW + H, NOW)).toBe('วันนี้')
    expect(relDay(NOW + DAY, NOW)).toBe('พรุ่งนี้')
  })
  it('says how long ago', () => {
    expect(timeAgo(NOW - 5 * 60_000, NOW)).toBe('5 นาทีที่แล้ว')
    expect(timeAgo(NOW - 3 * H, NOW)).toBe('3 ชม.ที่แล้ว')
  })
})

describe('hoursByCategory', () => {
  it('sums hours per category in category order and skips empty ones', () => {
    const list = [act('b1', { categoryKey: 'blood' }), act('s1', { categoryKey: 'setup' }), act('b2', { categoryKey: 'blood' }), act('k1', { categoryKey: 'bottle' })]
    const credits = [credit('s1'), credit('b1'), { ...credit('b2'), hours: 1.5 }, credit('gone')]
    expect(hoursByCategory(credits, list)).toEqual([
      { k: 'blood', hours: 7.5 },
      { k: 'setup', hours: 6 },
    ])
    expect(hoursByCategory([], list)).toEqual([])
  })
})
