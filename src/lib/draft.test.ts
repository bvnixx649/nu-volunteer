import { describe, expect, it } from 'vitest'
import { CATEGORIES, categoryOf } from '../data/categories'
import type { Activity } from '../data/types'
import { applyCategory, blankDraft, check, draftOf, firstBlocked, isDirty, posterChoices, toEdit, toNewActivity, type Draft } from './draft'

const none = new Set<string>()
const filled = (over: Partial<Draft> = {}): Draft => ({
  ...applyCategory(blankDraft('พี่เต้'), 'blood', none),
  title: 'บริจาคโลหิต',
  date: '2026-11-20',
  place: 'อาคารอเนกประสงค์',
  ...over,
})

describe('applyCategory', () => {
  it('fills every default from the category', () => {
    const d = applyCategory(blankDraft(), 'setup', none)
    expect(d).toMatchObject({ categoryKey: 'setup', hours: '5', capLimit: true, capacity: '20', walkIn: false, qrMode: 'dynamic', poster: './posters/openhouse.jpg' })
    expect(d.description).toBe(CATEGORIES.setup.description)
  })
  it('leaves touched fields alone when the category changes', () => {
    const d1 = { ...applyCategory(blankDraft(), 'blood', none), hours: '4', walkIn: false }
    const d2 = applyCategory(d1, 'setup', new Set(['hours', 'walkIn']))
    expect(d2).toMatchObject({ categoryKey: 'setup', hours: '4', walkIn: false, capLimit: true, capacity: '20' })
  })
  it('fills the bottle defaults', () => {
    expect(applyCategory(blankDraft(), 'bottle', none)).toMatchObject({ qrMode: 'static', locMode: 'off', walkIn: true, hours: '1', poster: './posters/river.jpg' })
  })
  it('falls back to blood for a removed key', () => {
    expect(categoryOf('camp')).toBe(CATEGORIES.blood)
    expect(posterChoices('recycle' as never)).toEqual(CATEGORIES.blood.posters)
  })
})

describe('check', () => {
  it('needs a category, a title, then date and place', () => {
    expect(check(1, blankDraft()).ok).toBe(false)
    expect(check(1, filled()).ok).toBe(true)
    expect(check(2, filled({ title: '  ' })).ok).toBe(false)
    expect(check(3, filled({ date: '' })).ok).toBe(false)
    expect(check(3, filled({ place: ' ' })).ok).toBe(false)
    expect(check(3, filled()).ok).toBe(true)
  })
  it('wants the end after the start', () => {
    const c = check(3, filled({ startT: '10:00', endT: '10:00' }))
    expect(c.ok).toBe(false)
    expect(c.errors.endT).toBeTruthy()
    expect(check(3, filled({ startT: '10:00', endT: '09:00' })).ok).toBe(false)
  })
  it('takes whole hours 1 to 99', () => {
    for (const h of ['1', '99', '6']) expect(check(4, filled({ hours: h })).ok).toBe(true)
    for (const h of ['0', '100', '2.5', '-1', 'abc']) expect(check(4, filled({ hours: h })).ok).toBe(false)
    const empty = check(4, filled({ hours: '' }))
    expect(empty.ok).toBe(false)
    expect(empty.errors.hours).toBeUndefined()
  })
  it('checks capacity only when limited', () => {
    expect(check(4, filled({ capLimit: false, capacity: '' })).ok).toBe(true)
    expect(check(4, filled({ capLimit: true, capacity: '' })).ok).toBe(false)
    expect(check(4, filled({ capLimit: true, capacity: '0' })).ok).toBe(false)
    expect(check(4, filled({ capLimit: true, capacity: '50' })).ok).toBe(true)
  })
  it('wants the opening time before the start', () => {
    expect(check(4, filled({ scheduled: true, openDate: '', openT: '' })).ok).toBe(false)
    expect(check(4, filled({ scheduled: true, openDate: '2026-11-10', openT: '08:00' })).ok).toBe(true)
    expect(check(4, filled({ scheduled: true, openDate: '2026-11-21', openT: '08:00' })).errors.openDate).toBeTruthy()
  })
  it('checks cancel days, the supervisor name and the chat link', () => {
    expect(check(4, filled({ cancelDays: '15' })).ok).toBe(false)
    expect(check(4, filled({ cancelDays: '0' })).ok).toBe(true)
    expect(check(6, filled({ supName: '' })).ok).toBe(false)
    expect(check(6, filled({ chatEnabled: true, openChatUrl: 'line.me' })).errors.openChatUrl).toBeTruthy()
    expect(check(6, filled({ chatEnabled: true, openChatUrl: 'https://line.me/ti/g2/x' })).ok).toBe(true)
    expect(check(6, filled({ chatEnabled: false, openChatUrl: 'nonsense' })).ok).toBe(true)
  })
  it('step 7 needs all the others and firstBlocked finds the first that fails', () => {
    expect(check(7, filled()).ok).toBe(true)
    expect(firstBlocked(filled())).toBe(7)
    expect(firstBlocked(filled({ place: '' }))).toBe(3)
    expect(firstBlocked(blankDraft())).toBe(1)
  })
})

describe('draft to activity and back', () => {
  const who = { orgCode: 'NUVOL69', orgName: 'ศูนย์จิตอาสา' }
  it('builds a new activity from a draft', () => {
    const a = toNewActivity(filled({ phone: ' 055961234 ', capLimit: false, capacity: '50' }), who)
    expect(a).toMatchObject({
      title: 'บริจาคโลหิต', categoryKey: 'blood', orgCode: 'NUVOL69', hours: 6, capLimit: false, capacity: 0, walkIn: true,
      supervisor: { name: 'พี่เต้', phone: '055961234' }, cancelDays: 2,
    })
    expect(a.end - a.start).toBe(7 * 3600_000)
    expect(a.opensAt).toBeUndefined()
    expect(a.hideUntilOpen).toBeUndefined()
  })
  it('keeps the chat link only when chat is on and the hide flag only when scheduled', () => {
    expect(toNewActivity(filled({ chatEnabled: false, openChatUrl: 'https://x.y' }), who).openChatUrl).toBeUndefined()
    expect(toNewActivity(filled({ hideUntilOpen: true }), who).hideUntilOpen).toBeUndefined()
    const s = toNewActivity(filled({ scheduled: true, hideUntilOpen: true, openDate: '2026-11-10', openT: '08:00' }), who)
    expect(s).toMatchObject({ hideUntilOpen: true })
    expect(s.opensAt).toBeLessThan(s.start)
  })
  it('round-trips through an activity', () => {
    const d = filled({ phone: '055', lat: 16.7, lng: 100.2, chatEnabled: true, openChatUrl: 'https://x.y', scheduled: true, openDate: '2026-11-10', openT: '08:00' })
    const a = { ...toNewActivity(d, who), id: 'x', createdAt: 0, regCount: 0, creditCount: 0 } as Activity
    expect(draftOf(a)).toEqual(d)
    const e = toEdit(d)
    expect('org' in e || 'orgCode' in e).toBe(false)
    expect(e).toMatchObject({ title: 'บริจาคโลหิต', lat: 16.7 })
  })
  it('detects changes', () => {
    const d = blankDraft('ก')
    expect(isDirty(d, blankDraft('ก'))).toBe(false)
    expect(isDirty({ ...d, title: 'x' }, d)).toBe(true)
  })
})
