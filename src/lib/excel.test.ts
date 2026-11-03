import { describe, expect, it } from 'vitest'
import { SUP_COLUMNS, supRows, xlsxName } from './excel'
import { thDate, thTime } from './format'
import type { Activity, Credit, Registration } from '../data/types'

const activity = { id: 'a1', title: 'บริจาคโลหิต ครั้งที่ 2/2569', categoryKey: 'blood', start: new Date(2026, 10, 20, 8).getTime(), hours: 6 } as Activity
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

const t1 = new Date(2026, 10, 20, 9, 5).getTime()
const t2 = new Date(2026, 10, 20, 10, 30).getTime()

describe('supRows', () => {
  const regs = [reg('1', 'ก'), reg('2', 'ข'), reg('3', 'ค', { walkIn: true }), reg('4', 'ง', { cancelledAt: 5 })]
  const credits = [
    cred('1', 'ก', t1),
    cred('3', 'ค', t2, { method: 'manual', editedBy: 'พี่เต้', hours: 3, reason: 'มาสาย', flags: ['location', 'device'], distance: 212.6 }),
  ]
  const rows = supRows(activity, regs, credits)

  it('uses the exact column names', () => {
    expect(SUP_COLUMNS).toEqual(['ลำดับ', 'รหัสนิสิต', 'ชื่อ', 'กิจกรรม', 'หมวด', 'วันที่', 'ชั่วโมง', 'สถานะ', 'เวลายืนยัน', 'ยืนยันโดย', 'หมายเหตุ'])
    expect(Object.keys(rows[0])).toEqual([...SUP_COLUMNS])
  })

  it('lists newest scans first, then people who did not come, skipping cancelled', () => {
    expect(rows.map((r) => r['รหัสนิสิต'])).toEqual(['3', '1', '2'])
    expect(rows.map((r) => r['ลำดับ'])).toEqual([1, 2, 3])
  })

  it('fills a scanned person', () => {
    expect(rows[1]).toMatchObject({
      ชื่อ: 'ก',
      กิจกรรม: activity.title,
      หมวด: 'บริจาคโลหิต',
      วันที่: thDate(activity.start),
      ชั่วโมง: 6,
      สถานะ: 'ได้ชั่วโมง',
      เวลายืนยัน: `${thTime(t1)} น.`,
      ยืนยันโดย: 'สแกน QR',
      หมายเหตุ: '',
    })
  })

  it('marks a walk-in with edited hours, the editor and flags', () => {
    expect(rows[0]).toMatchObject({
      ชั่วโมง: 3,
      สถานะ: 'ไม่ได้ลงทะเบียน',
      ยืนยันโดย: 'พี่เต้',
      หมายเหตุ: 'มาสาย, อยู่นอกพื้นที่ 213 ม., เครื่องซ้ำ',
    })
  })

  it('writes bottles in the note and does not call a bottle desk entry unregistered', () => {
    const c = { ...credits[1], items: 45, flags: [] as Credit['flags'] }
    const out = supRows(activity, regs, [credits[0], c])
    const row = out.find((r) => r['รหัสนิสิต'] === c.studentId)
    expect(row).toMatchObject({ สถานะ: 'ได้ชั่วโมง' })
    expect(String(row?.หมายเหตุ)).toContain('45 ขวด')
  })

  it('gives a no-show 0 hours and empty time', () => {
    expect(rows[2]).toMatchObject({ ชั่วโมง: 0, สถานะ: 'ไม่มา', เวลายืนยัน: '', ยืนยันโดย: '', หมายเหตุ: '' })
  })
})

describe('xlsxName', () => {
  it('cuts the title to 40 characters', () => {
    expect(xlsxName('สั้น')).toBe('สั้น รายชื่อ.xlsx')
    expect(xlsxName('ก'.repeat(50))).toBe(`${'ก'.repeat(40)} รายชื่อ.xlsx`)
  })
})
