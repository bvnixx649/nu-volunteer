import { categoryOf } from '../data/categories'
import type { Activity, Credit, Registration } from '../data/types'
import { thDate, thTime } from './format'
import { rosterRows } from './roster'

/** Activity supervisor file columns, in order. SPEC section 12. */
export const SUP_COLUMNS = ['ลำดับ', 'รหัสนิสิต', 'ชื่อ', 'กิจกรรม', 'หมวด', 'วันที่', 'ชั่วโมง', 'สถานะ', 'เวลายืนยัน', 'ยืนยันโดย', 'หมายเหตุ'] as const

export type SupRow = Record<(typeof SUP_COLUMNS)[number], string | number>

/** One row per person in roster order. Hours are the per-person hours after edits, 0 for no-shows. */
export function supRows(activity: Activity, regs: Registration[], credits: Credit[]): SupRow[] {
  return rosterRows(regs, credits, 'all', '').map((r, i) => {
    const c = r.credit
    const notes = [
      c?.items !== undefined && `${c.items} ขวด`,
      c?.reason,
      c?.flags.includes('location') && (c.distance !== undefined ? `อยู่นอกพื้นที่ ${Math.round(c.distance)} ม.` : 'อยู่นอกพื้นที่'),
      c?.flags.includes('device') && 'เครื่องซ้ำ',
      c?.flags.includes('offline') && 'ส่งภายหลัง',
    ].filter(Boolean)
    return {
      ลำดับ: i + 1,
      รหัสนิสิต: r.studentId,
      ชื่อ: r.name,
      กิจกรรม: activity.title,
      หมวด: categoryOf(activity.categoryKey).label,
      วันที่: thDate(activity.start),
      ชั่วโมง: c ? c.hours : 0,
      สถานะ: !c ? 'ไม่มา' : r.reg?.walkIn && c.items === undefined ? 'ได้ชั่วโมง (ไม่ได้ลงทะเบียน)' : 'ได้ชั่วโมง',
      เวลายืนยัน: c ? `${thDate(c.at)} ${thTime(c.at)} น.` : '',
      ยืนยันโดย: !c ? '' : c.method === 'qr' ? 'สแกน QR' : (c.editedBy ?? 'ผู้ดูแล'),
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

/** Centre admin file columns, in order. SPEC section 12. */
export const ADMIN_COLUMNS = ['รหัสนิสิต', 'ชื่อ', 'กิจกรรม', 'หน่วยงาน', 'หมวด', 'วันที่', 'ชั่วโมง'] as const

export type AdminRow = Record<(typeof ADMIN_COLUMNS)[number], string | number>

/** One row per person who earned hours, by student id, with the hours after edits. No-shows and people left at 0 hours are not listed. */
export function adminRows(activity: Activity, credits: Credit[]): AdminRow[] {
  return credits
    .filter((c) => c.hours > 0)
    .sort((a, b) => a.studentId.localeCompare(b.studentId))
    .map((c) => ({
      รหัสนิสิต: c.studentId,
      ชื่อ: c.name,
      กิจกรรม: activity.title,
      หน่วยงาน: activity.org,
      หมวด: categoryOf(activity.categoryKey).label,
      วันที่: thDate(activity.start),
      ชั่วโมง: c.hours,
    }))
}

export const adminXlsxName = (title: string) => `${title.slice(0, 40)} บันทึกชั่วโมง.xlsx`

const ADMIN_WIDTHS: Record<(typeof ADMIN_COLUMNS)[number], number> = { รหัสนิสิต: 12, ชื่อ: 28, กิจกรรม: 40, หน่วยงาน: 30, หมวด: 16, วันที่: 14, ชั่วโมง: 9 }

/** Builds and downloads the centre admin file. The library is loaded on demand. */
export async function downloadAdminXlsx(activity: Activity, credits: Credit[]) {
  const { default: writeXlsxFile } = await import('write-excel-file/browser')
  const rows = adminRows(activity, credits)
  await writeXlsxFile<AdminRow>(rows, {
    columns: ADMIN_COLUMNS.map((h) => ({ header: h, cell: (r: AdminRow) => r[h], width: ADMIN_WIDTHS[h] })),
  }).toFile(adminXlsxName(activity.title))
  return rows
}
