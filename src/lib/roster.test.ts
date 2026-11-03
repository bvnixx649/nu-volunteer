import { describe, expect, it } from 'vitest'
import { creditList, rosterRows, validHours } from './roster'
import type { Credit, Registration } from '../data/types'

describe('validHours', () => {
  it('accepts whole numbers from 0 to full', () => {
    expect(validHours('3', 6)).toBe(3)
    expect(validHours('0', 6)).toBe(0)
    expect(validHours('6', 6)).toBe(6)
  })
  it('rejects anything else', () => {
    for (const s of ['7', '-1', '2.5', '', ' ', 'abc', '1e1']) expect(validHours(s, 6)).toBeNull()
  })
})

const reg = (id: string, name: string, extra: Partial<Registration> = {}): Registration => ({ studentId: id, name, at: 1, ...extra })
const cred = (id: string, name: string, at: number, extra: Partial<Credit> = {}): Credit => ({
  studentId: id,
  name,
  hours: 6,
  fullHours: 6,
  at,
  method: 'qr',
  flags: [],
  ...extra,
})

const regs = [reg('65010001', 'สมชาย ใจดี'), reg('65020002', 'มานี มีนา'), reg('65010003', 'ปิติ ยินดี', { walkIn: true })]
const credits = [cred('65010001', 'สมชาย ใจดี', 100), cred('65010003', 'ปิติ ยินดี', 200, { flags: ['device'] })]

describe('rosterRows', () => {
  it('lists newest scans first, then people who have not scanned', () => {
    expect(rosterRows(regs, credits, 'all', '').map((r) => r.studentId)).toEqual(['65010003', '65010001', '65020002'])
  })
  it('notScanned keeps only registrations without a credit', () => {
    expect(rosterRows(regs, credits, 'notScanned', '').map((r) => r.studentId)).toEqual(['65020002'])
  })
  it('credited keeps only people with a credit', () => {
    expect(rosterRows(regs, credits, 'credited', '')).toHaveLength(2)
  })
  it('walkIn keeps walk-in registrations', () => {
    expect(rosterRows(regs, credits, 'walkIn', '').map((r) => r.studentId)).toEqual(['65010003'])
  })
  it('flagged keeps credits with any flag', () => {
    expect(rosterRows(regs, credits, 'flagged', '').map((r) => r.studentId)).toEqual(['65010003'])
  })
  it('searches by id prefix', () => {
    expect(rosterRows(regs, credits, 'all', '6501').map((r) => r.studentId)).toEqual(['65010003', '65010001'])
  })
  it('searches by part of a name', () => {
    expect(rosterRows(regs, credits, 'all', 'มีนา').map((r) => r.studentId)).toEqual(['65020002'])
  })
  it('hides cancelled registrations', () => {
    expect(rosterRows([reg('1', 'x', { cancelledAt: 5 })], [], 'all', '')).toEqual([])
  })
  it('includes a credit with no registration', () => {
    expect(rosterRows([], [cred('9', 'y', 1)], 'all', '').map((r) => r.studentId)).toEqual(['9'])
  })
})

describe('creditList', () => {
  const c = (id: string, name: string, at: number) => ({ studentId: id, name, hours: 6, fullHours: 6, at, method: 'qr' as const, flags: [] })
  const list = [c('65010003', 'สมหญิง ใจดี', 30), c('65010001', 'สมชาย รักเรียน', 10), c('65020002', 'ธนากร แสงทอง', 20)]
  it('numbers by time and keeps the numbers when searching', () => {
    expect(creditList(list, '').map((r) => [r.n, r.credit.studentId])).toEqual([[1, '65010001'], [2, '65020002'], [3, '65010003']])
    expect(creditList(list, '650100').map((r) => r.n)).toEqual([1, 3])
    expect(creditList(list, 'ธนากร').map((r) => r.n)).toEqual([2])
  })
})
