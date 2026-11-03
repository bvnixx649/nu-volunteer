import { categoryOf } from '../data/categories'
import type { Activity, Credit, Registration } from '../data/types'
import { thDate, thTime } from './format'
import { rosterRows } from './roster'

/** Supervisor file columns, in order. SPEC section 12. */
export const SUP_COLUMNS = ['ลำดับ', 'รหัสนิสิต', 'ชื่อ', 'กิจกรรม', 'หมวด', 'วันที่', 'ชั่วโมง', 'สถานะ', 'เวลายืนยัน', 'ยืนยันโดย', 'หมายเหตุ'] as const

export type SupRow = Record<(typeof SUP_COLUMNS)[number], string | number>

/** One row per person in roster order. Hours are the per-person hours after edits, 0 for no-shows. */
export function supRows(activity: Activity, regs: Registration[], credits: Credit[]): SupRow[] {
  return rosterRows(regs, credits, 'all', '').map((r, i) => {
    const c = r.credit
    const notes = [
      c?.reason,
      c?.flags.includes('location') && (c.distance !== undefined ? `ตำแหน่งไม่ผ่าน ${Math.round(c.distance)} ม.` : 'ตำแหน่งไม่ผ่าน'),
      c?.flags.includes('device') && 'เครื่องซ้ำ',
    ].filter(Boolean)
    return {
      ลำดับ: i + 1,
      รหัสนิสิต: r.studentId,
      ชื่อ: r.name,
      กิจกรรม: activity.title,
      หมวด: categoryOf(activity.categoryKey).label,
      วันที่: thDate(activity.start),
      ชั่วโมง: c ? c.hours : 0,
      สถานะ: !c ? 'ไม่มา' : r.reg?.walkIn ? 'มาเพิ่ม' : 'ได้ชั่วโมง',
      เวลายืนยัน: c ? `${thTime(c.at)} น.` : '',
      ยืนยันโดย: !c ? '' : c.method === 'qr' ? 'สแกน QR' : (c.editedBy ?? 'ผู้คุม'),
      หมายเหตุ: notes.join(', '),
    }
  })
}

export const xlsxName = (title: string) => `${title.slice(0, 40)} รายชื่อ.xlsx`

const WIDTHS: Record<(typeof SUP_COLUMNS)[number], number> = {
  ลำดับ: 7,
  รหัสนิสิต: 12,
  ชื่อ: 28,
  กิจกรรม: 40,
  หมวด: 16,
  วันที่: 14,
  ชั่วโมง: 9,
  สถานะ: 12,
  เวลายืนยัน: 12,
  ยืนยันโดย: 16,
  หมายเหตุ: 36,
}

/** Builds and downloads the supervisor file. The library is loaded on demand. */
export async function downloadSupXlsx(activity: Activity, regs: Registration[], credits: Credit[]) {
  const { default: writeXlsxFile } = await import('write-excel-file/browser')
  const rows = supRows(activity, regs, credits)
  await writeXlsxFile<SupRow>(rows, {
    columns: SUP_COLUMNS.map((h) => ({ header: h, cell: (r: SupRow) => r[h], width: WIDTHS[h] })),
  }).toFile(xlsxName(activity.title))
  return rows
}
