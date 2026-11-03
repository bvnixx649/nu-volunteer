import { describe, expect, it } from 'vitest'
import { checkinOf, checkinSummary } from './checkin'

describe('checkinOf', () => {
  it('fills the new fields on data saved before they existed', () => {
    expect(checkinOf({ locMode: 'flex' as never })).toEqual({ locMode: 'on', radius: 150, qrInterval: 10 })
  })
  it('keeps off as off', () => expect(checkinOf({ locMode: 'off' }).locMode).toBe('off'))
  it('turns old strict and missing values into on', () => {
    expect(checkinOf({ locMode: 'strict' as never }).locMode).toBe('on')
    expect(checkinOf({}).locMode).toBe('on')
  })
  it('keeps valid values', () => expect(checkinOf({ locMode: 'on', radius: 300, qrInterval: 15 })).toEqual({ locMode: 'on', radius: 300, qrInterval: 15 }))
  it('ignores values that are not numbers', () => expect(checkinOf({ radius: 'x' as never, qrInterval: 0 })).toMatchObject({ radius: 150, qrInterval: 10 }))
})

describe('checkinSummary', () => {
  it('describes a dynamic QR with location', () => {
    expect(checkinSummary({ qrMode: 'dynamic', qrInterval: 10, locMode: 'on', radius: 150 })).toBe('QR เปลี่ยนทุก 10 วิ ตรวจตำแหน่ง 150 ม.')
  })
  it('describes a static QR without location', () => {
    expect(checkinSummary({ qrMode: 'static', locMode: 'off' })).toBe('QR แบบพิมพ์ ไม่ตรวจตำแหน่ง')
  })
})
