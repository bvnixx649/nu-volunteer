import { describe, expect, it } from 'vitest'
import { cleanName, isStudentId, thDate, thTime } from './format'

describe('format', () => {
  it('accepts only 8-digit student ids', () => {
    expect(isStudentId('6501234')).toBe(false)
    expect(isStudentId('65012345')).toBe(true)
    expect(isStudentId('6501234a')).toBe(false)
    expect(isStudentId(' 65012345 ')).toBe(false)
  })
  it('trims and collapses spaces in names', () => {
    expect(cleanName('  สมชาย   ใจดี ')).toBe('สมชาย ใจดี')
  })
  it('formats dates in the Buddhist era', () => {
    expect(thDate(new Date(2026, 10, 20, 9, 41).getTime())).toBe('20 พ.ย. 2569')
  })
  it('formats 24-hour time', () => {
    expect(thTime(new Date(2026, 10, 20, 9, 5).getTime())).toBe('09:05')
  })
})
