import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { createLocalApi, resetLocal } from './local'
import type { Activity, Credit, NewActivity } from './types'
import { addBottles } from '../lib/bottle'

const activity = {
  id: 'a1',
  title: 'บริจาคโลหิต',
  hours: 6,
  walkIn: true,
  regCount: 0,
  creditCount: 0,
} as Activity

const input = (id: string, deviceId = 'dev-1') => ({
  activityId: 'a1',
  student: { id, name: `นิสิต ${id}` },
  hours: 6,
  method: 'qr' as const,
  flags: [],
  deviceId,
  ref: 'R1',
})

const setOnline = (v: boolean) => Object.defineProperty(navigator, 'onLine', { value: v, configurable: true })

let api: ReturnType<typeof createLocalApi>
beforeEach(() => {
  resetLocal({ activities: { a1: activity } })
  api = createLocalApi()
})
afterEach(() => setOnline(true))

describe('claim', () => {
  it('writes one credit when the same student claims twice at once', async () => {
    const [x, y] = await Promise.all([api.claim(input('65000001')), api.claim(input('65000001'))])
    expect([x.ok, y.ok].sort()).toEqual([false, true])
    expect([x, y].find((r) => !r.ok)).toMatchObject({ reason: 'already' })
    expect(await api.getActivity('a1')).toMatchObject({ creditCount: 1 })
  })

  it('creates a walk-in registration for someone who never registered', async () => {
    await api.claim(input('65000002'))
    expect(await api.getRegistration('a1', '65000002')).toMatchObject({ walkIn: true, name: 'นิสิต 65000002' })
    expect(await api.getActivity('a1')).toMatchObject({ regCount: 1 })
  })

  it('records full hours and server-side fields on the credit', async () => {
    const r = await api.claim(input('65000003'))
    expect(r.ok && r.credit).toMatchObject({ hours: 6, fullHours: 6, method: 'qr', ref: 'R1' })
  })

  it('refuses to write while offline', async () => {
    setOnline(false)
    expect(await api.claim(input('65000004'))).toEqual({ ok: false, reason: 'offline' })
    setOnline(true)
    expect(await api.getCredit('a1', '65000004')).toBeNull()
  })

  it('flags every credit from a device that claimed for two students', async () => {
    await api.claim(input('65000005', 'shared'))
    await api.claim(input('65000006', 'shared'))
    await api.claim(input('65000007', 'other'))
    expect((await api.getCredit('a1', '65000005'))?.flags).toEqual(['device'])
    expect((await api.getCredit('a1', '65000006'))?.flags).toEqual(['device'])
    expect((await api.getCredit('a1', '65000007'))?.flags).toEqual([])
  })
})

describe('claim with scannedAt (kept offline, sent later)', () => {
  beforeEach(() => {
    const t = Date.now()
    resetLocal({ activities: { a1: { ...activity, start: t - 3600_000, end: t + 3600_000 } } })
  })

  it('stores the real scan time and flags the credit', async () => {
    const scannedAt = Date.now() - 20 * 60_000
    const r = await api.claim({ ...input('65000040'), scannedAt })
    expect(r.ok && r.credit).toMatchObject({ at: scannedAt, flags: ['offline'] })
    expect(await api.getRegistration('a1', '65000040')).toMatchObject({ at: scannedAt, walkIn: true })
  })

  it('uses now, without the flag, for a time that is in the future, too old or outside the activity', async () => {
    const before = Date.now()
    for (const [i, scannedAt] of [Date.now() + 600_000, Date.now() - 49 * 3600_000, Date.now() - 3 * 3600_000].entries()) {
      const r = await api.claim({ ...input(`6500005${i}`, `dev-${i}`), scannedAt })
      expect(r.ok && r.credit.flags).toEqual([])
      expect(r.ok && r.credit.at).toBeGreaterThanOrEqual(before)
    }
  })

  it('still refuses a second claim', async () => {
    await api.claim({ ...input('65000060'), scannedAt: Date.now() - 60_000 })
    const again = await api.claim({ ...input('65000060'), scannedAt: Date.now() - 30_000 })
    expect(again.ok).toBe(false)
  })
})

describe('edits', () => {
  it('lowers hours with a reason and remembers who did it', async () => {
    await api.claim(input('65000008'))
    await api.setHours('a1', '65000008', 3, 'มาสาย', 'พี่เต้')
    expect(await api.getCredit('a1', '65000008')).toMatchObject({ hours: 3, fullHours: 6, reason: 'มาสาย', editedBy: 'พี่เต้' })
  })

  it('removing a credit lowers the counter', async () => {
    await api.claim(input('65000009'))
    await api.removeCredit('a1', '65000009')
    expect(await api.getCredit('a1', '65000009')).toBeNull()
    expect(await api.getActivity('a1')).toMatchObject({ creditCount: 0 })
  })
})

describe('bottle exchange', () => {
  const bottles = { ...activity, id: 'b1', categoryKey: 'bottle', itemsPerHour: 20, hours: 5 } as Activity
  beforeEach(() => resetLocal({ activities: { b1: bottles } }))

  it('creates the credit on the first save and adds to it on the next', async () => {
    const s = { id: '65000030', name: 'นิสิต' }
    expect(await addBottles(api, bottles, s, 45, 'พี่เต้')).toEqual({ items: 45, hours: 2 })
    expect(await api.getCredit('b1', s.id)).toMatchObject({ hours: 2, items: 45, method: 'manual' })
    expect(await addBottles(api, bottles, s, 15, 'พี่เต้')).toEqual({ items: 60, hours: 3 })
    expect(await api.getCredit('b1', s.id)).toMatchObject({ hours: 3, items: 60 })
    expect(await api.getActivity('b1')).toMatchObject({ creditCount: 1 })
  })

  it('stops at the maximum hours but keeps counting bottles', async () => {
    const s = { id: '65000031', name: 'นิสิต' }
    await addBottles(api, bottles, s, 90, 'พี่เต้')
    expect(await addBottles(api, bottles, s, 40, 'พี่เต้')).toEqual({ items: 130, hours: 5 })
  })
})

describe('createActivity', () => {
  it('stores the activity under a new short id with counters at 0', async () => {
    const { id, createdAt, regCount, creditCount, ...input } = activity
    void id, createdAt, regCount, creditCount
    const a = await api.createActivity({ ...input, title: 'ใหม่' })
    const b = await api.createActivity(input)
    expect(a).toMatch(/^[0-9a-z]{10}$/)
    expect(b).not.toBe(a)
    expect(await api.getActivity(a)).toMatchObject({ id: a, title: 'ใหม่', regCount: 0, creditCount: 0, hours: 6 })
    expect((await api.getActivity(a))?.createdAt).toBeGreaterThan(0)
  })

  it('updates any editor field and clears optional ones', async () => {
    await api.updateActivity('a1', { title: 'ชื่อใหม่', walkIn: false, supervisor: { name: 'ข', phone: '1' }, opensAt: 5 })
    expect(await api.getActivity('a1')).toMatchObject({ title: 'ชื่อใหม่', walkIn: false, supervisor: { name: 'ข', phone: '1' }, opensAt: 5 })
    await api.updateActivity('a1', { opensAt: undefined })
    expect((await api.getActivity('a1'))?.opensAt).toBeUndefined()
  })
})

describe('watch', () => {
  it('calls back with the new credit after a claim', async () => {
    const seen: Credit[][] = []
    const stop = api.watchCredits('a1', (c) => seen.push(c))
    await api.claim(input('65000010'))
    stop()
    expect(seen.at(-1)?.map((c) => c.studentId)).toEqual(['65000010'])
  })
})

describe('students', () => {
  it('creates and reads a student', async () => {
    await api.createStudent({ id: '65000011', name: 'สมชาย', createdAt: 1 })
    expect(await api.getStudent('65000011')).toMatchObject({ name: 'สมชาย' })
    expect(await api.getStudent('65999999')).toBeNull()
  })
})

describe('roster', () => {
  const addReg = (id: string) =>
    resetLocal({
      activities: { a1: { ...activity, regCount: 1, creditCount: 0 } },
      regs: { a1: { [id]: { studentId: id, name: 'ลงชื่อไว้', at: 1 } } },
    })

  it('removes a registration together with its credit and lowers both counters', async () => {
    await api.claim(input('65000020'))
    await api.removeRegistration('a1', '65000020')
    expect(await api.getRegistration('a1', '65000020')).toBeNull()
    expect(await api.getCredit('a1', '65000020')).toBeNull()
    expect(await api.getActivity('a1')).toMatchObject({ regCount: 0, creditCount: 0 })
  })

  it('removes a registration that has no credit and leaves creditCount alone', async () => {
    await api.claim(input('65000021'))
    addReg('65000022')
    await api.removeRegistration('a1', '65000022')
    expect(await api.getRegistration('a1', '65000022')).toBeNull()
    expect(await api.getActivity('a1')).toMatchObject({ regCount: 0, creditCount: 0 })
  })

  it('never takes the counters below 0 and ignores unknown people', async () => {
    resetLocal({
      activities: { a1: { ...activity, regCount: 0, creditCount: 0 } },
      regs: { a1: { '65000023': { studentId: '65000023', name: 'x', at: 1 } } },
      credits: { a1: { '65000023': { studentId: '65000023', name: 'x', hours: 6, fullHours: 6, at: 1, method: 'qr', flags: [] } } },
    })
    await api.removeRegistration('a1', '65000023')
    await api.removeRegistration('a1', '65999999')
    expect(await api.getActivity('a1')).toMatchObject({ regCount: 0, creditCount: 0 })
  })

  it('updates check-in settings and leaves other fields alone', async () => {
    await api.updateActivity('a1', { qrInterval: 15, radius: 200, locMode: 'off' })
    expect(await api.getActivity('a1')).toMatchObject({ qrInterval: 15, radius: 200, locMode: 'off', hours: 6 })
    await api.updateActivity('nope', { radius: 300 })
    expect(await api.getActivity('nope')).toBeNull()
  })

  it('closes the roster once and keeps the first time', async () => {
    await api.closeRoster('a1')
    const first = (await api.getActivity('a1'))?.closedAt
    expect(first).toBeGreaterThan(0)
    await new Promise((r) => setTimeout(r, 5))
    await api.closeRoster('a1')
    expect((await api.getActivity('a1'))?.closedAt).toBe(first)
  })

  it('submits the roster and closes it at the same time when it was still open', async () => {
    await api.submitRoster('a1')
    const a = await api.getActivity('a1')
    expect(a?.submittedAt).toBeGreaterThan(0)
    expect(a?.closedAt).toBe(a?.submittedAt)
    const t = a?.submittedAt
    await new Promise((r) => setTimeout(r, 5))
    await api.submitRoster('a1')
    expect((await api.getActivity('a1'))?.submittedAt).toBe(t)
  })

  it('keeps the earlier closing time when submitting', async () => {
    await api.closeRoster('a1')
    const closed = (await api.getActivity('a1'))?.closedAt
    await new Promise((r) => setTimeout(r, 5))
    await api.submitRoster('a1')
    expect((await api.getActivity('a1'))?.closedAt).toBe(closed)
  })
})

describe('student side', () => {
  const me = { id: '65010009', name: 'นิสิต ทดสอบ' }

  it('registers once, respects the seat limit and reopens after a cancel', async () => {
    resetLocal({ activities: { a1: { ...activity, capLimit: true, capacity: 1 } } })
    api = createLocalApi()
    expect(await api.register('a1', me)).toBe('ok')
    expect(await api.register('a1', me)).toBe('already')
    expect(await api.register('a1', { id: '65010010', name: 'อีกคน' })).toBe('full')
    await api.cancelRegistration('a1', me.id, false)
    expect(await api.getActivity('a1')).toMatchObject({ regCount: 0 })
    expect(await api.register('a1', { id: '65010010', name: 'อีกคน' })).toBe('ok')
  })

  it('records a late cancel on the registration', async () => {
    await api.register('a1', me)
    await api.cancelRegistration('a1', me.id, true)
    expect(await api.studentRegistrations(me.id)).toMatchObject([{ activityId: 'a1', late: true }])
    expect((await api.studentRegistrations(me.id))[0].cancelledAt).toBeTypeOf('number')
  })

  it('lists a student own credits with their activity and the activity credits oldest first', async () => {
    await api.claim(input('65000005'))
    await new Promise((r) => setTimeout(r, 5))
    await api.claim(input(me.id, 'dev-2'))
    expect((await api.listCredits('a1')).map((c) => c.studentId)).toEqual(['65000005', me.id])
    expect(await api.studentCredits(me.id)).toMatchObject([{ activityId: 'a1', studentId: me.id }])
  })

  it('keeps notices per student, newest first, and marks them read', async () => {
    await api.addNotice({ studentId: me.id, kind: 'registered', title: 'หนึ่ง' })
    await new Promise((r) => setTimeout(r, 5))
    await api.addNotice({ studentId: me.id, kind: 'credit', title: 'สอง' })
    await api.addNotice({ studentId: 'other', kind: 'credit', title: 'ของคนอื่น' })
    expect((await api.listNotices(me.id)).map((n) => n.title)).toEqual(['สอง', 'หนึ่ง'])
    await api.markNoticesRead(me.id)
    expect((await api.listNotices(me.id)).every((n) => n.read)).toBe(true)
    expect((await api.listNotices('other'))[0].read).toBe(false)
  })

  it('updates reminders and notify switches on the student', async () => {
    await api.createStudent({ ...me, createdAt: 1 })
    await api.updateStudent(me.id, { reminders: ['a1'], notify: { enabled: true, openings: true, announcements: false, messages: true } })
    expect(await api.getStudent(me.id)).toMatchObject({ reminders: ['a1'], notify: { enabled: true, announcements: false } })
  })

  it('marks only the other side messages in a thread as read', async () => {
    await api.sendDm({ activityId: 'a1', studentId: me.id, fromSup: false, authorName: me.name, text: 'ไม่สบาย' })
    await api.sendDm({ activityId: 'a1', studentId: me.id, fromSup: true, authorName: 'ผู้ดูแล', text: 'รับทราบ' })
    await api.markDmsRead('a1', me.id, false)
    expect((await api.listDms('a1', me.id)).map((m) => [m.fromSup, m.read])).toEqual([[false, false], [true, true]])
  })
})

describe('templates', () => {
  const tpl = (orgCode: string, title: string) => ({
    orgCode,
    title,
    poster: 'data:image/jpeg;base64,AAAA',
    description: 'ช่วยงานเทศกาล',
    hours: 4,
    settings: { capLimit: true, capacity: 12, walkIn: false, qrMode: 'static' as const, qrInterval: 10, locMode: 'off' as const, radius: 150 },
    createdBy: 'พี่เต้',
  })

  it('shares templates inside one organisation only, oldest first', async () => {
    const a = await api.createTemplate(tpl('NUVOL69', 'งานรับน้อง'))
    const b = await api.createTemplate(tpl('NUVOL69', 'งานกีฬา'))
    await api.createTemplate(tpl('OTHER', 'ของหน่วยงานอื่น'))
    expect(a.id).not.toBe(b.id)
    expect((await api.listTemplates('NUVOL69')).map((t) => t.title)).toEqual(['งานรับน้อง', 'งานกีฬา'])
  })

  it('updates and deletes, and an activity keeps its templateId', async () => {
    const t = await api.createTemplate(tpl('NUVOL69', 'งานรับน้อง'))
    await api.updateTemplate(t.id, { title: 'งานรับน้องใหม่', hours: 5 })
    expect((await api.listTemplates('NUVOL69'))[0]).toMatchObject({ title: 'งานรับน้องใหม่', hours: 5, description: 'ช่วยงานเทศกาล' })
    const id = await api.createActivity({ ...(activity as unknown as NewActivity), categoryKey: 'other', templateId: t.id })
    await api.deleteTemplate(t.id)
    expect(await api.listTemplates('NUVOL69')).toEqual([])
    expect(await api.getActivity(id)).toMatchObject({ categoryKey: 'other', templateId: t.id })
  })
})
