import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { createLocalApi, resetLocal } from './local'
import type { Activity, Credit } from './types'

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
