import { describe, expect, it } from 'vitest'
import { cleanName, dateTile, isStudentId, thDate, thDayMonth, thTime } from './format'

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
  it('formats a day and short month without the year', () => {
    expect(thDayMonth(new Date(2026, 10, 18, 9).getTime())).toBe('18 พ.ย.')
  })
  it('formats 24-hour time', () => {
    expect(thTime(new Date(2026, 10, 20, 9, 5).getTime())).toBe('09:05')
  })
})

describe('dateTile', () => {
  const now = new Date(2026, 10, 4, 15).getTime() // Wednesday 4 Nov 2026
  it('says today and tomorrow, else the short weekday', () => {
    expect(dateTile(new Date(2026, 10, 4, 9).getTime(), now)).toEqual({ dow: 'วันนี้', day: 4, mon: 'พ.ย.' })
    expect(dateTile(new Date(2026, 10, 5, 23).getTime(), now)).toEqual({ dow: 'พรุ่งนี้', day: 5, mon: 'พ.ย.' })
    expect(dateTile(new Date(2026, 10, 20, 8).getTime(), now)).toEqual({ dow: 'ศ.', day: 20, mon: 'พ.ย.' })
    expect(dateTile(new Date(2026, 10, 8, 8).getTime(), now).dow).toBe('อา.')
  })
})
